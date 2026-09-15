-- O QR representa a porta de entrada da clínica, não uma sessão diária.
-- Cada fila aberta é localizada pelo QR da clínica e pela data corrente.
alter table public.clinics
  add column if not exists queue_qr_token uuid default gen_random_uuid();

update public.clinics
set queue_qr_token = gen_random_uuid()
where queue_qr_token is null;

alter table public.clinics
  alter column queue_qr_token set default gen_random_uuid();

create unique index if not exists clinics_queue_qr_token_unique
  on public.clinics(queue_qr_token)
  where queue_qr_token is not null;

-- O mesmo QR pode apontar para várias sessões históricas da mesma clínica.
drop index if exists public.queue_sessions_public_token_idx;

create or replace function private.use_clinic_queue_qr_token()
returns trigger language plpgsql security definer set search_path = public, private
as $function$
begin
  select queue_qr_token into new.public_token from public.clinics where id = new.clinic_id;
  new.public_token := coalesce(new.public_token, gen_random_uuid());
  return new;
end;
$function$;

drop trigger if exists queue_sessions_use_clinic_qr on public.queue_sessions;
create trigger queue_sessions_use_clinic_qr
before insert on public.queue_sessions
for each row execute function private.use_clinic_queue_qr_token();

update public.queue_sessions session_row
set public_token = clinic.queue_qr_token
from public.clinics clinic
where clinic.id = session_row.clinic_id
  and session_row.public_token is distinct from clinic.queue_qr_token;

create or replace function private.get_public_queue_session(target_token uuid)
returns table(session_id uuid, clinic_name text, service_name text, service_date date, status text, entry_mode text, starts_at timestamptz, ends_at timestamptz, max_capacity integer)
language sql stable security definer set search_path = public, private
as $function$
  select session.id, clinic.name, service.name, session.service_date, session.status, session.entry_mode, session.starts_at, session.ends_at, session.max_capacity
  from public.clinics clinic
  join public.queue_sessions session on session.clinic_id = clinic.id
  left join public.clinic_services service on service.id = session.clinic_service_id
  where clinic.queue_qr_token = target_token
    and session.service_date = current_date
    and session.entry_mode in ('qr', 'both')
    and session.status in ('open', 'paused');
$function$;

create or replace function private.join_queue_as_patient(target_token uuid)
returns table(ticket_id uuid, ticket_number integer, queue_session_id uuid)
language plpgsql security definer set search_path = public, private
as $function$
declare session public.queue_sessions; patient_id_value uuid; next_number integer; active_count integer; new_ticket_id uuid;
begin
  if auth.uid() is null then raise exception 'Sessão obrigatória'; end if;
  if not private.has_role_code('patient') then raise exception 'Esta jornada está disponível para contas de paciente'; end if;
  select session_row.* into session
  from public.queue_sessions session_row
  join public.clinics clinic on clinic.id = session_row.clinic_id
  where clinic.queue_qr_token = target_token
    and session_row.service_date = current_date
  for update;
  if session.id is null or session.status <> 'open' or session.entry_mode not in ('qr','both') then raise exception 'Fila indisponível'; end if;
  select p.id into patient_id_value from public.profiles profile join public.patients p on p.person_id=profile.person_id where profile.id=auth.uid() and p.organization_id=session.organization_id and p.status='active' and exists(select 1 from public.patient_clinic_links link where link.patient_id=p.id and link.clinic_id=session.clinic_id) limit 1;
  if patient_id_value is null then raise exception 'Sua conta ainda não está vinculada a um paciente desta clínica'; end if;
  if exists(select 1 from public.queue_tickets t where t.queue_session_id=session.id and t.patient_id=patient_id_value and t.status in ('waiting','called','checked_in','in_service','waiting_supervision','paused')) then
    return query select t.id,t.ticket_number,t.queue_session_id from public.queue_tickets t where t.queue_session_id=session.id and t.patient_id=patient_id_value and t.status in ('waiting','called','checked_in','in_service','waiting_supervision','paused') order by t.created_at desc limit 1;
    return;
  end if;
  perform pg_advisory_xact_lock(hashtext(session.id::text));
  select count(*) into active_count from public.queue_tickets t where t.queue_session_id=session.id and t.status in ('waiting','called','checked_in','in_service','waiting_supervision','paused');
  if active_count >= session.max_capacity then raise exception 'A capacidade máxima desta fila foi atingida'; end if;
  select coalesce(max(t.ticket_number),0)+1 into next_number from public.queue_tickets t where t.queue_session_id=session.id;
  insert into public.queue_tickets(queue_session_id,patient_id,ticket_number,priority,created_by,updated_by) values(session.id,patient_id_value,next_number,'normal',auth.uid(),auth.uid()) returning id into new_ticket_id;
  insert into public.queue_events(organization_id,clinic_id,queue_session_id,queue_ticket_id,event_type,new_status,actor_id) values(session.organization_id,session.clinic_id,session.id,new_ticket_id,'ticket.joined_qr','waiting',auth.uid());
  return query select new_ticket_id,next_number,session.id;
end;
$function$;

create or replace function private.rotate_clinic_queue_qr_token(target_clinic_id uuid, revoke_token boolean default false)
returns uuid language plpgsql security definer set search_path = public, private
as $function$
declare clinic_row public.clinics;
begin
  select * into clinic_row from public.clinics where id = target_clinic_id for update;
  if clinic_row.id is null then raise exception 'Clínica não encontrada'; end if;
  if not private.has_clinic_permission(clinic_row.organization_id, clinic_row.id, 'queue.manage') then raise exception 'Sem permissão para gerenciar o QR Code desta clínica'; end if;
  update public.clinics set queue_qr_token = case when revoke_token then null else gen_random_uuid() end where id = clinic_row.id returning queue_qr_token into clinic_row.queue_qr_token;
  update public.queue_sessions
  set public_token = coalesce(clinic_row.queue_qr_token, gen_random_uuid())
  where clinic_id = clinic_row.id and service_date = current_date;
  return clinic_row.queue_qr_token;
end;
$function$;

create or replace function public.rotate_clinic_queue_qr_token(target_clinic_id uuid, revoke_token boolean default false)
returns uuid language sql security invoker set search_path = public, private
as $function$ select private.rotate_clinic_queue_qr_token(target_clinic_id, revoke_token); $function$;

revoke execute on function public.rotate_clinic_queue_qr_token(uuid, boolean) from public, anon;
grant execute on function public.rotate_clinic_queue_qr_token(uuid, boolean) to authenticated;
