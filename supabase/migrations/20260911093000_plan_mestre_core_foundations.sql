-- Plano Mestre UNIG Clínicas: fundações do ciclo 3 (fila) e ciclo 2 (cadastro).
-- Esta migration adiciona dados operacionais sem duplicar o cadastro por especialidade.

alter table public.queue_sessions
  add column if not exists clinic_service_id uuid references public.clinic_services(id),
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists max_capacity integer not null default 100,
  add column if not exists concurrent_capacity integer not null default 1,
  add column if not exists entry_mode text not null default 'both',
  add column if not exists public_token uuid not null default gen_random_uuid();

alter table public.queue_sessions
  drop constraint if exists queue_sessions_entry_mode_check,
  add constraint queue_sessions_entry_mode_check check (entry_mode in ('manual', 'qr', 'both')),
  drop constraint if exists queue_sessions_capacity_check,
  add constraint queue_sessions_capacity_check check (max_capacity > 0 and concurrent_capacity > 0),
  drop constraint if exists queue_sessions_schedule_check,
  add constraint queue_sessions_schedule_check check (ends_at is null or starts_at is null or ends_at > starts_at);

create unique index if not exists queue_sessions_public_token_idx on public.queue_sessions(public_token);
create index if not exists queue_sessions_service_date_idx on public.queue_sessions(clinic_id, service_date, status);

alter table public.queue_tickets
  add column if not exists checked_in_at timestamptz,
  add column if not exists service_started_at timestamptz,
  add column if not exists supervision_waiting_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists no_show_at timestamptz,
  add column if not exists transferred_at timestamptz,
  add column if not exists service_box text;

alter table public.queue_tickets drop constraint if exists queue_tickets_status_check;
alter table public.queue_tickets add constraint queue_tickets_status_check
  check (status in ('waiting', 'called', 'checked_in', 'in_service', 'waiting_supervision', 'completed', 'cancelled', 'no_show', 'transferred', 'paused'));

create table if not exists public.queue_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  clinic_id uuid not null references public.clinics(id),
  queue_session_id uuid not null references public.queue_sessions(id),
  queue_ticket_id uuid references public.queue_tickets(id),
  event_type text not null,
  previous_status text,
  new_status text,
  actor_id uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists queue_events_clinic_created_idx on public.queue_events(clinic_id, created_at desc);
create index if not exists queue_events_ticket_created_idx on public.queue_events(queue_ticket_id, created_at desc);
alter table public.queue_events enable row level security;
grant select on public.queue_events to authenticated;
drop policy if exists queue_events_select on public.queue_events;
create policy queue_events_select on public.queue_events for select to authenticated
  using (private.has_clinic_permission(organization_id, clinic_id, 'queue.read'));

-- O estado da senha só muda por esta função: o frontend não decide transições.
create or replace function private.transition_queue_ticket(
  target_ticket_id uuid,
  target_status text,
  target_service_box text default null
) returns public.queue_tickets
language plpgsql security definer set search_path = public, private
as $function$
declare
  ticket public.queue_tickets;
  session public.queue_sessions;
  allowed boolean := false;
  event_name text;
  previous_status text;
begin
  if (select auth.uid()) is null then raise exception 'Sessão obrigatória'; end if;
  select * into ticket from public.queue_tickets where id = target_ticket_id for update;
  if ticket.id is null then raise exception 'Senha não encontrada'; end if;
  select * into session from public.queue_sessions where id = ticket.queue_session_id;
  if session.id is null then raise exception 'Fila não encontrada'; end if;
  previous_status := ticket.status;
  if not private.has_clinic_permission(session.organization_id, session.clinic_id, 'queue.manage') then
    raise exception 'Sem permissão para operar esta fila';
  end if;

  allowed := case ticket.status
    when 'waiting' then target_status in ('called','cancelled','no_show','transferred','paused')
    when 'called' then target_status in ('checked_in','in_service','cancelled','no_show','transferred')
    when 'checked_in' then target_status in ('in_service','cancelled','no_show','transferred')
    when 'in_service' then target_status in ('waiting_supervision','completed','cancelled','transferred')
    when 'waiting_supervision' then target_status in ('completed','in_service','transferred')
    when 'paused' then target_status in ('waiting','cancelled','transferred')
    else false
  end;
  if not allowed then raise exception 'Transição de fila inválida: % -> %', ticket.status, target_status; end if;

  if target_status = 'in_service' then
    if (select count(*) from public.queue_tickets active where active.queue_session_id = ticket.queue_session_id and active.status = 'in_service' and active.id <> ticket.id) >= session.concurrent_capacity then
      raise exception 'A capacidade simultânea desta fila foi atingida';
    end if;
  end if;

  update public.queue_tickets set
    status = target_status,
    called_at = case when target_status = 'called' then coalesce(called_at, now()) else called_at end,
    checked_in_at = case when target_status = 'checked_in' then coalesce(checked_in_at, now()) else checked_in_at end,
    service_started_at = case when target_status = 'in_service' then coalesce(service_started_at, now()) else service_started_at end,
    supervision_waiting_at = case when target_status = 'waiting_supervision' then coalesce(supervision_waiting_at, now()) else supervision_waiting_at end,
    completed_at = case when target_status = 'completed' then coalesce(completed_at, now()) else completed_at end,
    cancelled_at = case when target_status = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end,
    no_show_at = case when target_status = 'no_show' then coalesce(no_show_at, now()) else no_show_at end,
    transferred_at = case when target_status = 'transferred' then coalesce(transferred_at, now()) else transferred_at end,
    service_box = coalesce(target_service_box, service_box),
    updated_at = now(), updated_by = auth.uid()
  where id = ticket.id
  returning * into ticket;

  event_name := 'ticket.' || target_status;
  insert into public.queue_events(organization_id, clinic_id, queue_session_id, queue_ticket_id, event_type, previous_status, new_status, actor_id, metadata)
    values (session.organization_id, session.clinic_id, session.id, ticket.id, event_name, previous_status, target_status, auth.uid(), jsonb_build_object('service_box', target_service_box));
  return ticket;
end;
$function$;

-- Preserva o status anterior no evento sem permitir que o chamador escreva diretamente na tabela.
create or replace function public.transition_queue_ticket(target_ticket_id uuid, target_status text, target_service_box text default null)
returns public.queue_tickets
language sql security invoker set search_path = public, private
as $function$ select private.transition_queue_ticket(target_ticket_id, target_status, target_service_box); $function$;
revoke execute on function public.transition_queue_ticket(uuid, text, text) from public, anon;
grant execute on function public.transition_queue_ticket(uuid, text, text) to authenticated;

create or replace function private.transition_queue_session(target_session_id uuid, target_status text)
returns public.queue_sessions
language plpgsql security definer set search_path = public, private
as $function$
declare current_session public.queue_sessions;
  previous_status text;
begin
  select * into current_session from public.queue_sessions where id = target_session_id for update;
  if current_session.id is null then raise exception 'Fila não encontrada'; end if;
  previous_status := current_session.status;
  if not private.has_clinic_permission(current_session.organization_id, current_session.clinic_id, 'queue.manage') then raise exception 'Sem permissão para operar esta fila'; end if;
  if not ((current_session.status = 'open' and target_status in ('paused','closed')) or (current_session.status = 'paused' and target_status in ('open','closed'))) then
    raise exception 'Transição de fila inválida: % -> %', current_session.status, target_status;
  end if;
  update public.queue_sessions set status = target_status, updated_at = now(), updated_by = auth.uid() where id = current_session.id returning * into current_session;
  insert into public.queue_events(organization_id, clinic_id, queue_session_id, event_type, previous_status, new_status, actor_id)
    values (current_session.organization_id, current_session.clinic_id, current_session.id, 'session.' || target_status, previous_status, target_status, auth.uid());
  return current_session;
end;
$function$;
create or replace function public.transition_queue_session(target_session_id uuid, target_status text)
returns public.queue_sessions language sql security invoker set search_path = public, private
as $function$ select private.transition_queue_session(target_session_id, target_status); $function$;
revoke execute on function public.transition_queue_session(uuid, text) from public, anon;
grant execute on function public.transition_queue_session(uuid, text) to authenticated;

-- Consulta mínima para QR: não expõe pacientes, documentos ou prontuário.
create or replace function private.get_public_queue_session(target_token uuid)
returns table(session_id uuid, clinic_name text, service_name text, service_date date, status text, entry_mode text, starts_at timestamptz, ends_at timestamptz, max_capacity integer)
language sql stable security definer set search_path = public, private
as $function$
  select session.id, clinic.name, service.name, session.service_date, session.status, session.entry_mode, session.starts_at, session.ends_at, session.max_capacity
  from public.queue_sessions session
  join public.clinics clinic on clinic.id = session.clinic_id
  left join public.clinic_services service on service.id = session.clinic_service_id
  where session.public_token = target_token and session.entry_mode in ('qr','both') and session.status in ('open','paused');
$function$;
create or replace function public.get_public_queue_session(target_token uuid)
returns table(session_id uuid, clinic_name text, service_name text, service_date date, status text, entry_mode text, starts_at timestamptz, ends_at timestamptz, max_capacity integer)
language sql security invoker set search_path = public, private
as $function$ select * from private.get_public_queue_session(target_token); $function$;
revoke execute on function public.get_public_queue_session(uuid) from public;
grant execute on function public.get_public_queue_session(uuid) to anon, authenticated;

-- Cadastro complementar do núcleo, separado de qualquer prontuário de especialidade.
create table if not exists public.patient_contacts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), patient_id uuid not null references public.patients(id),
  contact_type text not null check (contact_type in ('phone','whatsapp','email','other')), value text not null, is_primary boolean not null default false, verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id)
);
create table if not exists public.patient_addresses (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), patient_id uuid not null references public.patients(id),
  postal_code text, street text, number text, complement text, neighborhood text, city text, state text, is_primary boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id)
);
create index if not exists patient_contacts_patient_idx on public.patient_contacts(patient_id, is_primary desc);
create index if not exists patient_addresses_patient_idx on public.patient_addresses(patient_id, is_primary desc);
create trigger patient_contacts_set_updated_at before update on public.patient_contacts for each row execute function private.set_updated_at();
create trigger patient_addresses_set_updated_at before update on public.patient_addresses for each row execute function private.set_updated_at();
grant select, insert, update on public.patient_contacts, public.patient_addresses to authenticated;
alter table public.patient_contacts enable row level security;
alter table public.patient_addresses enable row level security;
create policy patient_contacts_read on public.patient_contacts for select to authenticated using (private.has_patient_permission(organization_id, patient_id, 'patient.read'));
create policy patient_contacts_write on public.patient_contacts for insert to authenticated with check (private.has_patient_permission(organization_id, patient_id, 'patient.manage'));
create policy patient_contacts_update on public.patient_contacts for update to authenticated using (private.has_patient_permission(organization_id, patient_id, 'patient.manage')) with check (private.has_patient_permission(organization_id, patient_id, 'patient.manage'));
create policy patient_addresses_read on public.patient_addresses for select to authenticated using (private.has_patient_permission(organization_id, patient_id, 'patient.read'));
create policy patient_addresses_write on public.patient_addresses for insert to authenticated with check (private.has_patient_permission(organization_id, patient_id, 'patient.manage'));
create policy patient_addresses_update on public.patient_addresses for update to authenticated using (private.has_patient_permission(organization_id, patient_id, 'patient.manage')) with check (private.has_patient_permission(organization_id, patient_id, 'patient.manage'));

-- Relacionamentos clínicos previstos no plano, sem replicar pessoas por clínica.
create table if not exists public.encounter_participants (
  id uuid primary key default gen_random_uuid(), encounter_id uuid not null references public.encounters(id), user_id uuid not null references auth.users(id), participant_type text not null check (participant_type in ('student','professional','supervisor','assistant')), is_primary boolean not null default false, created_at timestamptz not null default now(), created_by uuid references auth.users(id), unique(encounter_id, user_id, participant_type)
);
create index if not exists encounter_participants_encounter_idx on public.encounter_participants(encounter_id);
grant select, insert, update on public.encounter_participants to authenticated;
alter table public.encounter_participants enable row level security;
create policy encounter_participants_read on public.encounter_participants for select to authenticated using (exists (select 1 from public.encounters encounter where encounter.id = encounter_participants.encounter_id and private.has_clinic_permission(encounter.organization_id, encounter.clinic_id, 'clinical.read')));
create policy encounter_participants_write on public.encounter_participants for insert to authenticated with check (exists (select 1 from public.encounters encounter where encounter.id = encounter_participants.encounter_id and private.has_clinic_permission(encounter.organization_id, encounter.clinic_id, 'clinical.write')));
create policy encounter_participants_update on public.encounter_participants for update to authenticated using (exists (select 1 from public.encounters encounter where encounter.id = encounter_participants.encounter_id and private.has_clinic_permission(encounter.organization_id, encounter.clinic_id, 'clinical.write'))) with check (exists (select 1 from public.encounters encounter where encounter.id = encounter_participants.encounter_id and private.has_clinic_permission(encounter.organization_id, encounter.clinic_id, 'clinical.write')));

create table if not exists public.exam_results (
  id uuid primary key default gen_random_uuid(), exam_order_id uuid not null references public.exam_orders(id), organization_id uuid not null references public.organizations(id), clinic_id uuid not null references public.clinics(id), result_type text not null default 'report', result_text text, result_data jsonb not null default '{}'::jsonb, resulted_at timestamptz, created_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create index if not exists exam_results_order_idx on public.exam_results(exam_order_id, resulted_at desc);
grant select, insert, update on public.exam_results to authenticated;
alter table public.exam_results enable row level security;
create policy exam_results_read on public.exam_results for select to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'clinical.read'));
create policy exam_results_write on public.exam_results for insert to authenticated with check (private.has_clinic_permission(organization_id, clinic_id, 'clinical.write'));
create policy exam_results_update on public.exam_results for update to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'clinical.write')) with check (private.has_clinic_permission(organization_id, clinic_id, 'clinical.write'));

-- Registro de eventos de segurança fica separado da auditoria funcional.
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id), actor_id uuid references auth.users(id), event_type text not null, severity text not null default 'info' check (severity in ('info','warning','critical')), entity_type text, entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists security_events_org_created_idx on public.security_events(organization_id, created_at desc);
grant select on public.security_events to authenticated;
alter table public.security_events enable row level security;
create policy security_events_read on public.security_events for select to authenticated using (organization_id is not null and private.has_unscoped_permission(organization_id, 'audit.read'));

-- Garante que eventos de fila entrem no Realtime, sem tornar o prontuário inteiro realtime.
do $$ begin
  alter publication supabase_realtime add table public.queue_events;
exception when duplicate_object then null;
end $$;
