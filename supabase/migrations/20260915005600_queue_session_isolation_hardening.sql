-- Queue isolation hardening. This migration is additive: historical sessions
-- and tickets remain intact and are backfilled from their parent session.

alter table public.queue_sessions
  add column if not exists opened_at timestamptz,
  add column if not exists opened_by uuid references auth.users(id),
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid references auth.users(id),
  add column if not exists accepting_new_entries boolean not null default true,
  add column if not exists last_ticket_number integer not null default 0;

-- A clinic owns one stable public QR token. The token resolves the current
-- operational session and never embeds a date or a transient session ID.
alter table public.clinics
  add column if not exists queue_qr_token uuid;
update public.clinics
set queue_qr_token = coalesce(queue_qr_token, gen_random_uuid());
alter table public.clinics
  alter column queue_qr_token set default gen_random_uuid(),
  alter column queue_qr_token set not null;
create unique index if not exists clinics_queue_qr_token_unique
  on public.clinics(queue_qr_token);

update public.queue_sessions
set opened_at = coalesce(opened_at, created_at),
    opened_by = coalesce(opened_by, created_by),
    last_ticket_number = greatest(
      last_ticket_number,
      coalesce((select max(ticket.ticket_number) from public.queue_tickets ticket where ticket.queue_session_id = queue_sessions.id), 0)
    );

alter table public.queue_sessions
  alter column opened_at set not null;

alter table public.queue_sessions
  drop constraint if exists queue_sessions_status_check,
  add constraint queue_sessions_status_check
    check (status in ('open', 'paused', 'closing', 'closed')),
  add constraint queue_sessions_last_ticket_number_check check (last_ticket_number >= 0);

alter table public.queue_tickets
  add column if not exists clinic_id uuid references public.clinics(id),
  add column if not exists ticket_code text,
  add column if not exists joined_at timestamptz;

update public.queue_tickets ticket
set clinic_id = session.clinic_id,
    joined_at = coalesce(ticket.joined_at, ticket.created_at)
from public.queue_sessions session
where session.id = ticket.queue_session_id
  and (ticket.clinic_id is null or ticket.joined_at is null);

create or replace function private.set_queue_ticket_scope()
returns trigger language plpgsql security definer set search_path = public, private
as $function$
declare session_row public.queue_sessions; clinic_code text;
begin
  select * into session_row from public.queue_sessions where id = new.queue_session_id;
  if session_row.id is null then raise exception 'Sessão de fila inválida'; end if;
  if new.clinic_id is not null and new.clinic_id <> session_row.clinic_id then
    raise exception 'O escopo da senha deve ser o da sessão';
  end if;
  new.clinic_id := session_row.clinic_id;
  new.joined_at := coalesce(new.joined_at, now());
  select code into clinic_code from public.clinics where id = session_row.clinic_id;
  new.ticket_code := coalesce(new.ticket_code, upper(left(coalesce(clinic_code, 'S'), 1)) || '-' || lpad(new.ticket_number::text, 3, '0'));
  return new;
end;
$function$;

drop trigger if exists queue_tickets_set_scope on public.queue_tickets;
create trigger queue_tickets_set_scope
before insert or update of queue_session_id, clinic_id, ticket_number on public.queue_tickets
for each row execute function private.set_queue_ticket_scope();

-- Populate the display code only after the trigger exists, so legacy data is
-- normalized with the same rule as new tickets.
update public.queue_tickets set ticket_code = null where ticket_code is null;
update public.queue_tickets set ticket_number = ticket_number where ticket_code is null;

alter table public.queue_tickets
  alter column clinic_id set not null,
  alter column joined_at set not null,
  alter column ticket_code set not null;

create unique index if not exists queue_tickets_session_code_unique
  on public.queue_tickets(queue_session_id, ticket_code);
create index if not exists queue_tickets_clinic_session_status_idx
  on public.queue_tickets(clinic_id, queue_session_id, status, ticket_number);
create index if not exists queue_sessions_operational_idx
  on public.queue_sessions(clinic_id, status, accepting_new_entries, opened_at desc);

-- Repair only stale operational states. Historical records are retained. A
-- stale session with patients still in progress becomes closing so a team can
-- finish it deliberately; otherwise it is closed with an audit event.
do $legacy_queue_repair$
declare
  stale_session record;
  has_active_tickets boolean;
  target_status text;
begin
  perform set_config('unig.queue_transition', '1', true);
  for stale_session in
    select id, organization_id, clinic_id, status
    from public.queue_sessions
    where service_date < current_date
      and status in ('open', 'paused')
    for update
  loop
    select exists (
      select 1 from public.queue_tickets ticket
      where ticket.queue_session_id = stale_session.id
        and ticket.status in ('waiting','called','checked_in','in_service','waiting_supervision','paused')
    ) into has_active_tickets;
    target_status := case when has_active_tickets then 'closing' else 'closed' end;

    update public.queue_sessions
    set status = target_status,
        accepting_new_entries = false,
        closed_at = case when target_status = 'closed' then coalesce(closed_at, now()) else closed_at end,
        updated_at = now()
    where id = stale_session.id;

    insert into public.queue_events(
      organization_id, clinic_id, queue_session_id, event_type,
      previous_status, new_status, metadata
    ) values (
      stale_session.organization_id, stale_session.clinic_id, stale_session.id,
      'session.legacy_repaired', stale_session.status, target_status,
      jsonb_build_object('reason', 'stale_operational_session')
    );
  end loop;
end;
$legacy_queue_repair$;

-- The database, not the UI, is the last line of defense against two open
-- sessions for the same clinic. Closing sessions are intentionally excluded so
-- staff can finish already-admitted patients while the next day is prepared.
create unique index if not exists queue_sessions_one_open_per_clinic_idx
  on public.queue_sessions(clinic_id)
  where status = 'open';

-- Opening a queue and recording its audit event are one transaction. The
-- existing daily unique key remains in place for backwards compatibility;
-- a closed session can be explicitly reopened only by an authorized user.
create or replace function private.open_clinic_queue(target_clinic_id uuid)
returns public.queue_sessions language plpgsql security definer set search_path = public, private
as $function$
declare session_row public.queue_sessions;
begin
  select * into session_row from public.queue_sessions
  where clinic_id = target_clinic_id and service_date = current_date
  for update;
  if session_row.id is not null then
    if not private.has_clinic_permission(session_row.organization_id, session_row.clinic_id, 'queue.manage') then
      raise exception 'Sem permissão para operar esta fila';
    end if;
    if session_row.status = 'closed' then
      perform set_config('unig.queue_transition', '1', true);
      update public.queue_sessions set status = 'open', accepting_new_entries = true,
        closed_at = null, closed_by = null, updated_at = now(), updated_by = auth.uid()
      where id = session_row.id returning * into session_row;
      insert into public.queue_events(organization_id, clinic_id, queue_session_id, event_type, previous_status, new_status, actor_id)
      values(session_row.organization_id, session_row.clinic_id, session_row.id, 'session.reopened', 'closed', 'open', auth.uid());
    end if;
    return session_row;
  end if;
  select organization_id into session_row.organization_id from public.clinics where id = target_clinic_id;
  if session_row.organization_id is null or not private.has_clinic_permission(session_row.organization_id, target_clinic_id, 'queue.manage') then
    raise exception 'Sem permissão para abrir a fila desta clínica';
  end if;
  insert into public.queue_sessions(organization_id, clinic_id, service_date, status, opened_at, opened_by, created_by, updated_by)
  values(session_row.organization_id, target_clinic_id, current_date, 'open', now(), auth.uid(), auth.uid(), auth.uid())
  returning * into session_row;
  insert into public.queue_events(organization_id, clinic_id, queue_session_id, event_type, new_status, actor_id)
  values(session_row.organization_id, session_row.clinic_id, session_row.id, 'session.opened', 'open', auth.uid());
  return session_row;
end;
$function$;

create or replace function public.open_clinic_queue(target_clinic_id uuid)
returns public.queue_sessions language sql security invoker set search_path = public, private
as $function$ select private.open_clinic_queue(target_clinic_id); $function$;
revoke execute on function public.open_clinic_queue(uuid) from public, anon;
grant execute on function public.open_clinic_queue(uuid) to authenticated;

-- The operational UI may configure a session, but must never update its
-- identity, clinic scope, or status directly from the browser.
create or replace function private.configure_queue_session(
  target_session_id uuid,
  target_clinic_service_id uuid default null,
  target_entry_mode text default 'both',
  target_max_capacity integer default 100,
  target_concurrent_capacity integer default 1,
  target_starts_at timestamptz default null,
  target_ends_at timestamptz default null
)
returns public.queue_sessions language plpgsql security definer set search_path = public, private
as $function$
declare session_row public.queue_sessions;
begin
  if target_entry_mode not in ('manual', 'qr', 'both') then
    raise exception 'Modo de entrada inválido';
  end if;
  if target_max_capacity is null or target_max_capacity < 1 then
    raise exception 'A capacidade máxima deve ser maior que zero';
  end if;
  if target_concurrent_capacity is null or target_concurrent_capacity < 1 then
    raise exception 'A capacidade simultânea deve ser maior que zero';
  end if;
  if target_ends_at is not null and target_starts_at is not null and target_ends_at <= target_starts_at then
    raise exception 'O horário de término deve ser posterior ao início';
  end if;

  select * into session_row from public.queue_sessions where id = target_session_id for update;
  if session_row.id is null then raise exception 'Fila não encontrada'; end if;
  if not private.has_clinic_permission(session_row.organization_id, session_row.clinic_id, 'queue.manage') then
    raise exception 'Sem permissão para configurar esta fila';
  end if;
  if session_row.status = 'closed' then raise exception 'Uma fila encerrada não pode ser configurada'; end if;
  if target_clinic_service_id is not null and not exists (
    select 1 from public.clinic_services service
    where service.id = target_clinic_service_id
      and service.clinic_id = session_row.clinic_id
      and service.is_active
  ) then
    raise exception 'O serviço não pertence à clínica da fila';
  end if;

  update public.queue_sessions
  set clinic_service_id = target_clinic_service_id,
      entry_mode = target_entry_mode,
      max_capacity = target_max_capacity,
      concurrent_capacity = target_concurrent_capacity,
      starts_at = target_starts_at,
      ends_at = target_ends_at,
      updated_at = now(),
      updated_by = auth.uid()
  where id = session_row.id
  returning * into session_row;
  return session_row;
end;
$function$;

create or replace function public.configure_queue_session(
  target_session_id uuid,
  target_clinic_service_id uuid default null,
  target_entry_mode text default 'both',
  target_max_capacity integer default 100,
  target_concurrent_capacity integer default 1,
  target_starts_at timestamptz default null,
  target_ends_at timestamptz default null
)
returns public.queue_sessions language sql security invoker set search_path = public, private
as $function$
  select private.configure_queue_session(
    target_session_id, target_clinic_service_id, target_entry_mode,
    target_max_capacity, target_concurrent_capacity, target_starts_at, target_ends_at
  );
$function$;
revoke execute on function private.configure_queue_session(uuid, uuid, text, integer, integer, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.configure_queue_session(uuid, uuid, text, integer, integer, timestamptz, timestamptz) from public, anon;
grant execute on function public.configure_queue_session(uuid, uuid, text, integer, integer, timestamptz, timestamptz) to authenticated;

-- Public queue entry must allocate from the session counter, never MAX()+1.
create or replace function private.allocate_queue_ticket_number(p_session uuid)
returns integer language plpgsql security definer set search_path = public, private
as $function$
declare result integer;
begin
  update public.queue_sessions
  set last_ticket_number = last_ticket_number + 1, updated_at = now()
  where id = p_session and status = 'open' and accepting_new_entries
  returning last_ticket_number into result;
  if result is null then raise exception 'A fila não aceita novas entradas'; end if;
  return result;
end;
$function$;
revoke execute on function private.allocate_queue_ticket_number(uuid) from public, anon, authenticated;

create or replace function private.transition_queue_session(
  target_session_id uuid,
  target_status text
)
returns public.queue_sessions
language plpgsql security definer set search_path = public, private
as $function$
declare
  current_session public.queue_sessions;
  previous_status text;
  allowed boolean := false;
begin
  select * into current_session
  from public.queue_sessions
  where id = target_session_id
  for update;
  if current_session.id is null then raise exception 'Fila não encontrada'; end if;
  if not private.has_clinic_permission(
    current_session.organization_id, current_session.clinic_id, 'queue.manage'
  ) then
    raise exception 'Sem permissão para operar esta fila';
  end if;

  previous_status := current_session.status;
  allowed := (current_session.status = 'open' and target_status in ('paused', 'closing', 'closed'))
    or (current_session.status = 'paused' and target_status in ('open', 'closing', 'closed'))
    or (current_session.status = 'closing' and target_status = 'closed')
    or (current_session.status = 'closed' and target_status = 'open' and current_session.service_date = current_date);
  if not allowed then
    raise exception 'Transição de fila inválida: % -> %', current_session.status, target_status;
  end if;

  perform set_config('unig.queue_transition', '1', true);
  update public.queue_sessions
  set status = target_status,
      accepting_new_entries = case
        when target_status = 'open' then true
        when target_status in ('closing', 'closed') then false
        else accepting_new_entries
      end,
      closed_at = case when target_status = 'closed' then coalesce(closed_at, now()) else null end,
      closed_by = case when target_status = 'closed' then coalesce(closed_by, auth.uid()) else null end,
      updated_at = now(),
      updated_by = auth.uid()
  where id = current_session.id
  returning * into current_session;

  insert into public.queue_events(
    organization_id, clinic_id, queue_session_id, event_type,
    previous_status, new_status, actor_id
  ) values (
    current_session.organization_id, current_session.clinic_id, current_session.id,
    'session.' || target_status, previous_status, target_status, auth.uid()
  );
  return current_session;
end;
$function$;

-- The three supported entry paths must share the same per-session allocator.
-- Locking the session before the capacity check makes that check and allocation
-- serializable for a single clinic queue without coupling other clinics.
create or replace function public.issue_queue_ticket(
  target_queue_session_id uuid,
  target_patient_id uuid,
  ticket_priority text default 'normal',
  target_appointment_id uuid default null
)
returns uuid language plpgsql security invoker set search_path = public, private
as $function$
declare
  new_ticket_id uuid;
  next_number integer;
  session_row public.queue_sessions;
  active_count integer;
begin
  select * into session_row
  from public.queue_sessions
  where id = target_queue_session_id
  for update;

  if session_row.id is null then raise exception 'Fila não encontrada'; end if;
  if session_row.status <> 'open' or not session_row.accepting_new_entries then
    raise exception 'A fila não aceita novas entradas';
  end if;
  if not private.has_clinic_permission(session_row.organization_id, session_row.clinic_id, 'queue.manage') then
    raise exception 'Sem permissão para emitir senha nesta clínica';
  end if;
  if not exists (
    select 1
    from public.patients patient
    join public.patient_clinic_links link
      on link.patient_id = patient.id
     and link.clinic_id = session_row.clinic_id
    where patient.id = target_patient_id
      and patient.organization_id = session_row.organization_id
      and patient.status = 'active'
  ) then
    raise exception 'Paciente não está vinculado a esta clínica';
  end if;

  select count(*) into active_count
  from public.queue_tickets
  where queue_session_id = session_row.id
    and status in ('waiting','called','checked_in','in_service','waiting_supervision','paused');
  if active_count >= session_row.max_capacity then
    raise exception 'A capacidade máxima desta fila foi atingida';
  end if;

  next_number := private.allocate_queue_ticket_number(session_row.id);
  insert into public.queue_tickets (
    queue_session_id, clinic_id, patient_id, appointment_id, ticket_number,
    priority, created_by, updated_by
  ) values (
    session_row.id, session_row.clinic_id, target_patient_id, target_appointment_id,
    next_number, ticket_priority, auth.uid(), auth.uid()
  ) returning id into new_ticket_id;

  insert into public.queue_events(
    organization_id, clinic_id, queue_session_id, queue_ticket_id,
    event_type, new_status, actor_id
  ) values (
    session_row.organization_id, session_row.clinic_id, session_row.id,
    new_ticket_id, 'ticket.issued', 'waiting', auth.uid()
  );
  return new_ticket_id;
end;
$function$;

create or replace function private.join_queue_as_patient(target_token uuid)
returns table(ticket_id uuid, ticket_number integer, queue_session_id uuid)
language plpgsql security definer set search_path = public, private
as $function$
declare
  session_row public.queue_sessions;
  patient_id_value uuid;
  next_number integer;
  active_count integer;
  new_ticket_id uuid;
begin
  if auth.uid() is null then raise exception 'Sessão obrigatória'; end if;
  if not private.has_role_code('patient') then
    raise exception 'Esta jornada está disponível para contas de paciente';
  end if;

  select session.* into session_row
  from public.queue_sessions session
  join public.clinics clinic on clinic.id = session.clinic_id
  where clinic.queue_qr_token = target_token
    and session.status = 'open'
    and session.accepting_new_entries
    and session.entry_mode in ('qr', 'both')
  order by session.opened_at desc
  limit 1
  for update of session;

  if session_row.id is null then raise exception 'Fila indisponível'; end if;
  select patient.id into patient_id_value
  from public.profiles profile
  join public.patients patient on patient.person_id = profile.person_id
  where profile.id = auth.uid()
    and patient.organization_id = session_row.organization_id
    and patient.status = 'active'
    and exists (
      select 1 from public.patient_clinic_links link
      where link.patient_id = patient.id and link.clinic_id = session_row.clinic_id
    )
  limit 1;
  if patient_id_value is null then
    raise exception 'Sua conta ainda não está vinculada a um paciente desta clínica';
  end if;

  if exists (
    select 1 from public.queue_tickets ticket
    where ticket.queue_session_id = session_row.id
      and ticket.patient_id = patient_id_value
      and ticket.status in ('waiting','called','checked_in','in_service','waiting_supervision','paused')
  ) then
    return query
      select ticket.id, ticket.ticket_number, ticket.queue_session_id
      from public.queue_tickets ticket
      where ticket.queue_session_id = session_row.id
        and ticket.patient_id = patient_id_value
        and ticket.status in ('waiting','called','checked_in','in_service','waiting_supervision','paused')
      order by ticket.created_at desc
      limit 1;
    return;
  end if;

  select count(*) into active_count
  from public.queue_tickets ticket
  where ticket.queue_session_id = session_row.id
    and ticket.status in ('waiting','called','checked_in','in_service','waiting_supervision','paused');
  if active_count >= session_row.max_capacity then
    raise exception 'A capacidade máxima desta fila foi atingida';
  end if;

  next_number := private.allocate_queue_ticket_number(session_row.id);
  insert into public.queue_tickets(
    queue_session_id, clinic_id, patient_id, ticket_number, priority,
    created_by, updated_by
  ) values (
    session_row.id, session_row.clinic_id, patient_id_value, next_number,
    'normal', auth.uid(), auth.uid()
  ) returning id into new_ticket_id;
  insert into public.queue_events(
    organization_id, clinic_id, queue_session_id, queue_ticket_id,
    event_type, new_status, actor_id
  ) values (
    session_row.organization_id, session_row.clinic_id, session_row.id,
    new_ticket_id, 'ticket.joined_qr', 'waiting', auth.uid()
  );
  return query select new_ticket_id, next_number, session_row.id;
end;
$function$;

create or replace function private.get_public_queue_session(target_token uuid)
returns table(
  session_id uuid, clinic_name text, service_name text, service_date date,
  status text, entry_mode text, starts_at timestamptz, ends_at timestamptz,
  max_capacity integer
)
language sql stable security definer set search_path = public, private
as $function$
  select session.id, clinic.name, service.name, session.service_date,
    session.status, session.entry_mode, session.starts_at, session.ends_at,
    session.max_capacity
  from public.clinics clinic
  join public.queue_sessions session on session.clinic_id = clinic.id
  left join public.clinic_services service on service.id = session.clinic_service_id
  where clinic.queue_qr_token = target_token
    and session.status in ('open', 'paused', 'closing')
    and session.entry_mode in ('qr', 'both')
  order by session.opened_at desc
  limit 1;
$function$;

create or replace function private.join_queue_as_guest(
  target_token uuid,
  guest_full_name text,
  guest_phone text,
  guest_birth_date date default null,
  guest_document_number text default null,
  accepted_data_terms boolean default false,
  accepted_policy_version text default '2026-09'
)
returns table(ticket_id uuid, ticket_number integer, queue_session_id uuid)
language plpgsql security definer set search_path = public, private
as $function$
declare
  session_row public.queue_sessions;
  patient_id_value uuid;
  person_id_value uuid;
  normalized_phone text;
  normalized_document text;
  contact_fingerprint_value text;
  next_number integer;
  active_count integer;
  new_ticket_id uuid;
begin
  if not accepted_data_terms then
    raise exception 'É necessário aceitar o uso dos dados para entrar na fila';
  end if;
  if char_length(trim(coalesce(guest_full_name, ''))) < 3 then
    raise exception 'Informe o nome completo';
  end if;
  normalized_phone := regexp_replace(coalesce(guest_phone, ''), '\\D', '', 'g');
  if normalized_phone !~ '^[0-9]{10,13}$' then
    raise exception 'Informe um celular válido com DDD';
  end if;
  normalized_document := nullif(regexp_replace(coalesce(guest_document_number, ''), '\\D', '', 'g'), '');
  if normalized_document is not null and normalized_document !~ '^[0-9]{11,14}$' then
    raise exception 'Documento inválido';
  end if;

  select session.* into session_row
  from public.queue_sessions session
  join public.clinics clinic on clinic.id = session.clinic_id
  where clinic.queue_qr_token = target_token
    and session.status = 'open'
    and session.accepting_new_entries
    and session.entry_mode in ('qr', 'both')
  order by session.opened_at desc
  limit 1
  for update of session;
  if session_row.id is null then raise exception 'Fila indisponível'; end if;

  contact_fingerprint_value := md5(session_row.id::text || ':' || normalized_phone);
  if exists (
    select 1 from private.queue_guest_join_attempts attempt
    where attempt.queue_session_id = session_row.id
      and attempt.contact_fingerprint = contact_fingerprint_value
      and attempt.attempted_at > now() - interval '30 seconds'
  ) then
    raise exception 'Aguarde alguns segundos antes de tentar novamente';
  end if;
  insert into private.queue_guest_join_attempts(queue_session_id, contact_fingerprint)
  values (session_row.id, contact_fingerprint_value);

  select patient.id, person.id into patient_id_value, person_id_value
  from public.persons person
  join public.patients patient
    on patient.person_id = person.id
   and patient.organization_id = session_row.organization_id
   and patient.status = 'active'
  left join public.patient_clinic_links link
    on link.patient_id = patient.id and link.clinic_id = session_row.clinic_id
  where person.organization_id = session_row.organization_id
    and regexp_replace(coalesce(person.phone, ''), '\\D', '', 'g') = normalized_phone
    and (normalized_document is null or person.document_number = normalized_document)
  order by (link.id is not null) desc, patient.created_at asc
  limit 1;

  if patient_id_value is null then
    insert into public.persons(organization_id, full_name, document_number, birth_date, phone)
    values (
      session_row.organization_id, trim(guest_full_name), normalized_document,
      guest_birth_date, normalized_phone
    ) returning id into person_id_value;
    patient_id_value := gen_random_uuid();
    insert into public.patients(
      id, organization_id, person_id, record_number, status, registration_status
    ) values (
      patient_id_value, session_row.organization_id, person_id_value,
      'VIS-' || upper(substr(replace(patient_id_value::text, '-', ''), 1, 8)),
      'active', 'minimal'
    );
  end if;

  insert into public.patient_clinic_links(patient_id, clinic_id)
  values (patient_id_value, session_row.clinic_id)
  on conflict (patient_id, clinic_id) do nothing;
  insert into public.patient_data_consents(
    organization_id, patient_id, purpose, policy_version, source
  ) values (
    session_row.organization_id, patient_id_value, 'queue_guest_registration',
    coalesce(nullif(trim(accepted_policy_version), ''), '2026-09'), 'qr_guest'
  ) on conflict (patient_id, purpose, policy_version) do nothing;

  if exists (
    select 1 from public.queue_tickets ticket
    where ticket.queue_session_id = session_row.id
      and ticket.patient_id = patient_id_value
      and ticket.status in ('waiting','called','checked_in','in_service','waiting_supervision','paused')
  ) then
    return query
      select ticket.id, ticket.ticket_number, ticket.queue_session_id
      from public.queue_tickets ticket
      where ticket.queue_session_id = session_row.id
        and ticket.patient_id = patient_id_value
        and ticket.status in ('waiting','called','checked_in','in_service','waiting_supervision','paused')
      order by ticket.created_at desc
      limit 1;
    return;
  end if;

  select count(*) into active_count
  from public.queue_tickets ticket
  where ticket.queue_session_id = session_row.id
    and ticket.status in ('waiting','called','checked_in','in_service','waiting_supervision','paused');
  if active_count >= session_row.max_capacity then
    raise exception 'A capacidade máxima desta fila foi atingida';
  end if;

  next_number := private.allocate_queue_ticket_number(session_row.id);
  insert into public.queue_tickets(
    queue_session_id, clinic_id, patient_id, ticket_number, priority, entry_source
  ) values (
    session_row.id, session_row.clinic_id, patient_id_value, next_number,
    'normal', 'qr_guest'
  ) returning id into new_ticket_id;
  insert into public.queue_events(
    organization_id, clinic_id, queue_session_id, queue_ticket_id,
    event_type, new_status, metadata
  ) values (
    session_row.organization_id, session_row.clinic_id, session_row.id,
    new_ticket_id, 'ticket.joined_guest', 'waiting',
    jsonb_build_object('entry_source', 'qr_guest')
  );
  return query select new_ticket_id, next_number, session_row.id;
end;
$function$;
