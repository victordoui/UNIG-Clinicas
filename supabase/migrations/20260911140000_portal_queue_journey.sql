-- Ciclo 3/9: jornada QR autenticada, portal do paciente e portal do tutor.
create or replace function private.has_role_code(required_role text)
returns boolean language sql stable security definer set search_path = public, private
as $function$ select exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=auth.uid() and ur.is_active and r.code=required_role); $function$;
revoke execute on function private.has_role_code(text) from public, anon, authenticated;
grant execute on function private.has_role_code(text) to authenticated;

create or replace function private.join_queue_as_patient(target_token uuid)
returns table(ticket_id uuid, ticket_number integer, queue_session_id uuid)
language plpgsql security definer set search_path = public, private
as $function$
declare session public.queue_sessions; patient_id_value uuid; next_number integer; active_count integer; new_ticket_id uuid;
begin
  if auth.uid() is null then raise exception 'Sessão obrigatória'; end if;
  if not private.has_role_code('patient') then raise exception 'Esta jornada está disponível para contas de paciente'; end if;
  select * into session from public.queue_sessions where public_token=target_token for update;
  if session.id is null or session.status <> 'open' or session.entry_mode not in ('qr','both') then raise exception 'Fila indisponível'; end if;
  select p.id into patient_id_value from public.profiles profile join public.patients p on p.person_id=profile.person_id where profile.id=auth.uid() and p.organization_id=session.organization_id and p.status='active' and exists(select 1 from public.patient_clinic_links link where link.patient_id=p.id and link.clinic_id=session.clinic_id) limit 1;
  if patient_id_value is null then raise exception 'Sua conta ainda não está vinculada a um paciente desta clínica'; end if;
  if exists(select 1 from public.queue_tickets t where t.queue_session_id=session.id and t.patient_id=patient_id_value and t.status in ('waiting','called','checked_in','in_service','waiting_supervision','paused')) then
    select t.id,t.ticket_number,t.queue_session_id into ticket_id,ticket_number,queue_session_id from public.queue_tickets t where t.queue_session_id=session.id and t.patient_id=patient_id_value and t.status in ('waiting','called','checked_in','in_service','waiting_supervision','paused') order by t.created_at desc limit 1;
    return next; return;
  end if;
  perform pg_advisory_xact_lock(hashtext(session.id::text));
  select count(*) into active_count from public.queue_tickets where queue_session_id=session.id and status in ('waiting','called','checked_in','in_service','waiting_supervision','paused');
  if active_count >= session.max_capacity then raise exception 'A capacidade máxima desta fila foi atingida'; end if;
  select coalesce(max(t.ticket_number),0)+1 into next_number from public.queue_tickets t where t.queue_session_id=session.id;
  insert into public.queue_tickets(queue_session_id,patient_id,ticket_number,priority,created_by,updated_by) values(session.id,patient_id_value,next_number,'normal',auth.uid(),auth.uid()) returning id into new_ticket_id;
  insert into public.queue_events(organization_id,clinic_id,queue_session_id,queue_ticket_id,event_type,new_status,actor_id) values(session.organization_id,session.clinic_id,session.id,new_ticket_id,'ticket.joined_qr','waiting',auth.uid());
  return query select new_ticket_id,next_number,session.id;
end;
$function$;
create or replace function public.join_queue_as_patient(target_token uuid)
returns table(ticket_id uuid, ticket_number integer, queue_session_id uuid) language sql security invoker set search_path = public, private
as $function$ select * from private.join_queue_as_patient(target_token); $function$;
revoke execute on function public.join_queue_as_patient(uuid) from public, anon;
grant execute on function public.join_queue_as_patient(uuid) to authenticated;

create or replace function private.get_my_patient_portal()
returns table(patient_id uuid, full_name text, preferred_name text, record_number text, next_appointment_at timestamptz, next_clinic_name text, next_service_name text)
language sql stable security definer set search_path = public, private
as $function$
  select p.id, coalesce(person.preferred_name,person.full_name), person.preferred_name, p.record_number, appointment.scheduled_at, clinic.name, service.name
  from public.profiles profile join public.persons person on person.id=profile.person_id join public.patients p on p.person_id=person.id
  left join lateral (select a.scheduled_at,a.clinic_id,a.clinic_service_id from public.appointments a where a.patient_id=p.id and a.status in ('scheduled','confirmed','checked_in') and a.scheduled_at>=now() order by a.scheduled_at limit 1) appointment on true
  left join public.clinics clinic on clinic.id=appointment.clinic_id left join public.clinic_services service on service.id=appointment.clinic_service_id
  where profile.id=auth.uid() and p.status='active' and private.has_role_code('patient');
$function$;
create or replace function public.get_my_patient_portal()
returns table(patient_id uuid, full_name text, preferred_name text, record_number text, next_appointment_at timestamptz, next_clinic_name text, next_service_name text)
language sql security invoker set search_path = public, private
as $function$ select * from private.get_my_patient_portal(); $function$;
revoke execute on function public.get_my_patient_portal() from public, anon;
grant execute on function public.get_my_patient_portal() to authenticated;

create or replace function private.get_my_tutor_animals()
returns table(animal_id uuid, name text, species text, breed text, last_consultation_at timestamptz)
language sql stable security definer set search_path = public, private
as $function$
  select a.id,a.name,a.species,a.breed,max(consultation.created_at)
  from public.profiles profile join public.persons person on person.id=profile.person_id join public.animal_guardians guardian on guardian.person_id=person.id join public.animals a on a.id=guardian.animal_id
  left join public.veterinary_consultations consultation on consultation.animal_id=a.id
  where profile.id=auth.uid() and private.has_role_code('tutor')
  group by a.id,a.name,a.species,a.breed;
$function$;
create or replace function public.get_my_tutor_animals()
returns table(animal_id uuid, name text, species text, breed text, last_consultation_at timestamptz)
language sql security invoker set search_path = public, private
as $function$ select * from private.get_my_tutor_animals(); $function$;
revoke execute on function public.get_my_tutor_animals() from public, anon;
grant execute on function public.get_my_tutor_animals() to authenticated;
