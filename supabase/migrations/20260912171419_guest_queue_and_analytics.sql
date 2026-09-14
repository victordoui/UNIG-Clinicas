-- Entrada de visitante na fila e indicadores agregados.
-- Não cria um cadastro paralelo: o visitante vira um paciente mínimo, vinculado
-- somente à clínica da sessão, e pode completar a conta posteriormente.

alter table public.patients
  add column if not exists registration_status text not null default 'complete',
  add column if not exists profile_completed_at timestamptz;

alter table public.patients
  drop constraint if exists patients_registration_status_check,
  add constraint patients_registration_status_check
    check (registration_status in ('minimal', 'complete'));

alter table public.queue_tickets
  add column if not exists entry_source text not null default 'staff';

alter table public.queue_tickets
  drop constraint if exists queue_tickets_entry_source_check,
  add constraint queue_tickets_entry_source_check
    check (entry_source in ('staff', 'qr_authenticated', 'qr_guest'));

create index if not exists queue_tickets_session_created_idx
  on public.queue_tickets(queue_session_id, created_at, status);

create table if not exists public.patient_data_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  patient_id uuid not null references public.patients(id),
  purpose text not null check (purpose in ('queue_guest_registration')),
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  source text not null check (source in ('qr_guest')),
  created_at timestamptz not null default now(),
  unique (patient_id, purpose, policy_version)
);

alter table public.patient_data_consents enable row level security;
revoke all on public.patient_data_consents from anon, authenticated;

create table if not exists private.queue_guest_join_attempts (
  id uuid primary key default gen_random_uuid(),
  queue_session_id uuid not null references public.queue_sessions(id),
  contact_fingerprint text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists queue_guest_join_attempts_rate_idx
  on private.queue_guest_join_attempts(queue_session_id, contact_fingerprint, attempted_at desc);

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
  contact_fingerprint text;
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

  select * into session_row
  from public.queue_sessions
  where public_token = target_token
    and status = 'open'
    and entry_mode in ('qr', 'both')
  for update;

  if session_row.id is null then
    raise exception 'Fila indisponível';
  end if;

  contact_fingerprint := md5(session_row.id::text || ':' || normalized_phone);
  if exists (
    select 1
    from private.queue_guest_join_attempts attempt
    where attempt.queue_session_id = session_row.id
      and attempt.contact_fingerprint = contact_fingerprint
      and attempt.attempted_at > now() - interval '30 seconds'
  ) then
    raise exception 'Aguarde alguns segundos antes de tentar novamente';
  end if;

  insert into private.queue_guest_join_attempts(queue_session_id, contact_fingerprint)
  values (session_row.id, contact_fingerprint);

  select patient.id, person.id
    into patient_id_value, person_id_value
  from public.persons person
  join public.patients patient
    on patient.person_id = person.id
   and patient.organization_id = session_row.organization_id
   and patient.status = 'active'
  left join public.patient_clinic_links link
    on link.patient_id = patient.id
   and link.clinic_id = session_row.clinic_id
  where person.organization_id = session_row.organization_id
    and regexp_replace(coalesce(person.phone, ''), '\\D', '', 'g') = normalized_phone
    and (normalized_document is null or person.document_number = normalized_document)
  order by (link.id is not null) desc, patient.created_at asc
  limit 1;

  if patient_id_value is null then
    insert into public.persons(
      organization_id, full_name, document_number, birth_date, phone
    ) values (
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
      and ticket.status in ('waiting', 'called', 'checked_in', 'in_service', 'waiting_supervision', 'paused')
  ) then
    return query
      select ticket.id, ticket.ticket_number, ticket.queue_session_id
      from public.queue_tickets ticket
      where ticket.queue_session_id = session_row.id
        and ticket.patient_id = patient_id_value
        and ticket.status in ('waiting', 'called', 'checked_in', 'in_service', 'waiting_supervision', 'paused')
      order by ticket.created_at desc
      limit 1;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(session_row.id::text));
  select count(*) into active_count
  from public.queue_tickets ticket
  where ticket.queue_session_id = session_row.id
    and ticket.status in ('waiting', 'called', 'checked_in', 'in_service', 'waiting_supervision', 'paused');

  if active_count >= session_row.max_capacity then
    raise exception 'A capacidade máxima desta fila foi atingida';
  end if;

  select coalesce(max(ticket_number), 0) + 1 into next_number
  from public.queue_tickets
  where queue_session_id = session_row.id;

  insert into public.queue_tickets(
    queue_session_id, patient_id, ticket_number, priority, entry_source
  ) values (
    session_row.id, patient_id_value, next_number, 'normal', 'qr_guest'
  ) returning id into new_ticket_id;

  insert into public.queue_events(
    organization_id, clinic_id, queue_session_id, queue_ticket_id, event_type,
    new_status, metadata
  ) values (
    session_row.organization_id, session_row.clinic_id, session_row.id,
    new_ticket_id, 'ticket.joined_guest', 'waiting',
    jsonb_build_object('entry_source', 'qr_guest')
  );

  return query select new_ticket_id, next_number, session_row.id;
end;
$function$;

create or replace function public.join_queue_as_guest(
  target_token uuid,
  guest_full_name text,
  guest_phone text,
  guest_birth_date date default null,
  guest_document_number text default null,
  accepted_data_terms boolean default false,
  accepted_policy_version text default '2026-09'
)
returns table(ticket_id uuid, ticket_number integer, queue_session_id uuid)
language sql security invoker set search_path = public, private
as $function$
  select * from private.join_queue_as_guest(
    target_token, guest_full_name, guest_phone, guest_birth_date,
    guest_document_number, accepted_data_terms, accepted_policy_version
  );
$function$;

revoke execute on function private.join_queue_as_guest(uuid, text, text, date, text, boolean, text)
  from public, anon, authenticated;
revoke execute on function public.join_queue_as_guest(uuid, text, text, date, text, boolean, text)
  from public;
grant execute on function public.join_queue_as_guest(uuid, text, text, date, text, boolean, text)
  to anon, authenticated;

create or replace function private.get_clinic_operational_analytics(
  target_clinic_id uuid default null,
  date_from date default current_date - 29,
  date_to date default current_date
)
returns jsonb
language plpgsql stable security definer set search_path = public, private
as $function$
declare
  result jsonb;
begin
  if date_from is null or date_to is null or date_from > date_to or date_to - date_from > 366 then
    raise exception 'Informe um período de até 366 dias';
  end if;

  if not exists (
    select 1 from public.clinics clinic
    where clinic.is_active
      and (target_clinic_id is null or clinic.id = target_clinic_id)
      and private.has_clinic_permission(clinic.organization_id, clinic.id, 'clinic.manage')
  ) then
    raise exception 'Sem permissão para consultar indicadores neste escopo';
  end if;

  with scoped_clinics as (
    select clinic.id, clinic.name, clinic.organization_id
    from public.clinics clinic
    where clinic.is_active
      and (target_clinic_id is null or clinic.id = target_clinic_id)
      and private.has_clinic_permission(clinic.organization_id, clinic.id, 'clinic.manage')
  ), scoped_appointments as (
    select appointment.*
    from public.appointments appointment
    join scoped_clinics clinic on clinic.id = appointment.clinic_id
    where appointment.scheduled_at >= date_from::timestamptz
      and appointment.scheduled_at < (date_to + 1)::timestamptz
  ), scoped_tickets as (
    select ticket.*, session.clinic_id
    from public.queue_tickets ticket
    join public.queue_sessions session on session.id = ticket.queue_session_id
    join scoped_clinics clinic on clinic.id = session.clinic_id
    where ticket.created_at >= date_from::timestamptz
      and ticket.created_at < (date_to + 1)::timestamptz
  )
  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'appointments', (select count(*) from scoped_appointments),
      'completed_appointments', (select count(*) from scoped_appointments where status = 'completed'),
      'no_shows', (select count(*) from scoped_appointments where status = 'no_show') + (select count(*) from scoped_tickets where status = 'no_show'),
      'queue_entries', (select count(*) from scoped_tickets),
      'queue_completed', (select count(*) from scoped_tickets where status = 'completed'),
      'guest_entries', (select count(*) from scoped_tickets where entry_source = 'qr_guest'),
      'average_wait_minutes', coalesce((select round(avg(extract(epoch from (called_at - created_at)) / 60.0)::numeric, 1) from scoped_tickets where called_at is not null), 0)
    ),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', day::date,
        'appointments', appointments,
        'completed', completed,
        'queue_entries', queue_entries,
        'no_shows', no_shows
      ) order by day)
      from (
        select series.day,
          coalesce(appointment_data.appointments, 0)::int as appointments,
          coalesce(appointment_data.completed, 0)::int as completed,
          coalesce(ticket_data.queue_entries, 0)::int as queue_entries,
          (coalesce(appointment_data.no_shows, 0) + coalesce(ticket_data.no_shows, 0))::int as no_shows
        from generate_series(date_from, date_to, interval '1 day') as series(day)
        left join lateral (
          select count(*) as appointments,
            count(*) filter (where status = 'completed') as completed,
            count(*) filter (where status = 'no_show') as no_shows
          from scoped_appointments appointment
          where appointment.scheduled_at::date = series.day::date
        ) appointment_data on true
        left join lateral (
          select count(*) as queue_entries,
            count(*) filter (where status = 'no_show') as no_shows
          from scoped_tickets ticket
          where ticket.created_at::date = series.day::date
        ) ticket_data on true
      ) day_data
    ), '[]'::jsonb),
    'funnel', jsonb_build_object(
      'joined', (select count(*) from scoped_tickets),
      'called', (select count(*) from scoped_tickets where called_at is not null),
      'checked_in', (select count(*) from scoped_tickets where checked_in_at is not null),
      'completed', (select count(*) from scoped_tickets where completed_at is not null),
      'no_show', (select count(*) from scoped_tickets where no_show_at is not null)
    ),
    'wait_by_hour', coalesce((
      select jsonb_agg(jsonb_build_object('hour', hour, 'average_wait_minutes', average_wait_minutes) order by hour)
      from (
        select extract(hour from created_at)::int as hour,
          round(avg(extract(epoch from (called_at - created_at)) / 60.0)::numeric, 1) as average_wait_minutes
        from scoped_tickets
        where called_at is not null
        group by extract(hour from created_at)
      ) hourly
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$function$;

create or replace function public.get_clinic_operational_analytics(
  target_clinic_id uuid default null,
  date_from date default current_date - 29,
  date_to date default current_date
)
returns jsonb
language sql security invoker set search_path = public, private
as $function$
  select private.get_clinic_operational_analytics(target_clinic_id, date_from, date_to);
$function$;

revoke execute on function private.get_clinic_operational_analytics(uuid, date, date)
  from public, anon, authenticated;
revoke execute on function public.get_clinic_operational_analytics(uuid, date, date)
  from public, anon;
grant execute on function public.get_clinic_operational_analytics(uuid, date, date)
  to authenticated;
