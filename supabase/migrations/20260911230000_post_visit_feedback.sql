-- Avaliação pós-atendimento: uma resposta por agendamento concluído.
-- A tabela não concede leitura direta ao paciente/tutor nem à gestão: a
-- submissão e as médias passam por funções que preservam o menor privilégio.

create table public.appointment_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  clinic_id uuid not null references public.clinics(id),
  appointment_id uuid not null unique references public.appointments(id),
  patient_id uuid not null references public.patients(id),
  service_score smallint not null check (service_score between 1 and 5),
  organization_score smallint not null check (organization_score between 1 and 5),
  wait_score smallint not null check (wait_score between 1 and 5),
  structure_score smallint not null check (structure_score between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1500),
  submitted_at timestamptz not null default now()
);

create index appointment_feedback_clinic_submitted_idx
  on public.appointment_feedback(clinic_id, submitted_at desc);
create index appointment_feedback_organization_submitted_idx
  on public.appointment_feedback(organization_id, submitted_at desc);

alter table public.appointment_feedback enable row level security;
revoke all on public.appointment_feedback from anon, authenticated;
revoke delete on public.appointment_feedback from anon, authenticated;

create or replace function private.get_my_feedback_candidates()
returns table(
  appointment_id uuid,
  scheduled_at timestamptz,
  clinic_name text,
  service_name text,
  feedback_submitted boolean
)
language sql stable security definer set search_path = public, private
as $function$
  select
    appointment.id,
    appointment.scheduled_at,
    clinic.name,
    service.name,
    exists (
      select 1 from public.appointment_feedback feedback
      where feedback.appointment_id = appointment.id
    )
  from public.profiles profile
  join public.patients patient on patient.person_id = profile.person_id
  join public.appointments appointment on appointment.patient_id = patient.id
  join public.clinics clinic on clinic.id = appointment.clinic_id
  left join public.clinic_services service on service.id = appointment.clinic_service_id
  where profile.id = (select auth.uid())
    and patient.status = 'active'
    and appointment.status = 'completed'
    and private.has_role_code('patient')
  order by appointment.scheduled_at desc
  limit 20;
$function$;

create or replace function public.get_my_feedback_candidates()
returns table(
  appointment_id uuid,
  scheduled_at timestamptz,
  clinic_name text,
  service_name text,
  feedback_submitted boolean
)
language sql security invoker set search_path = public, private
as $function$
  select * from private.get_my_feedback_candidates();
$function$;

revoke execute on function public.get_my_feedback_candidates() from public, anon;
grant execute on function public.get_my_feedback_candidates() to authenticated;

create or replace function private.submit_my_appointment_feedback(
  target_appointment_id uuid,
  target_service_score smallint,
  target_organization_score smallint,
  target_wait_score smallint,
  target_structure_score smallint,
  target_comment text default null
)
returns uuid
language plpgsql security definer set search_path = public, private
as $function$
declare
  appointment_row public.appointments;
  new_feedback_id uuid;
begin
  if (select auth.uid()) is null or not private.has_role_code('patient') then
    raise exception 'A avaliação está disponível apenas para a conta do paciente';
  end if;

  if target_service_score not between 1 and 5
    or target_organization_score not between 1 and 5
    or target_wait_score not between 1 and 5
    or target_structure_score not between 1 and 5 then
    raise exception 'Cada critério deve receber uma nota entre 1 e 5';
  end if;

  if target_comment is not null and char_length(trim(target_comment)) > 1500 then
    raise exception 'O comentário pode ter no máximo 1500 caracteres';
  end if;

  select appointment.* into appointment_row
  from public.appointments appointment
  join public.patients patient on patient.id = appointment.patient_id
  join public.profiles profile on profile.person_id = patient.person_id
  where appointment.id = target_appointment_id
    and appointment.status = 'completed'
    and profile.id = (select auth.uid())
    and patient.status = 'active'
  for update of appointment;

  if appointment_row.id is null then
    raise exception 'Atendimento concluído não encontrado para a sua conta';
  end if;

  insert into public.appointment_feedback(
    organization_id, clinic_id, appointment_id, patient_id,
    service_score, organization_score, wait_score, structure_score, comment
  ) values (
    appointment_row.organization_id, appointment_row.clinic_id,
    appointment_row.id, appointment_row.patient_id,
    target_service_score, target_organization_score, target_wait_score,
    target_structure_score, nullif(trim(target_comment), '')
  ) returning id into new_feedback_id;

  insert into public.audit_logs(
    organization_id, actor_id, action, entity_table, entity_id, metadata
  ) values (
    appointment_row.organization_id, (select auth.uid()),
    'appointment_feedback.created', 'appointment_feedback', new_feedback_id,
    jsonb_build_object('appointment_id', appointment_row.id, 'clinic_id', appointment_row.clinic_id)
  );

  return new_feedback_id;
exception
  when unique_violation then
    raise exception 'Este atendimento já recebeu uma avaliação';
end;
$function$;

create or replace function public.submit_my_appointment_feedback(
  target_appointment_id uuid,
  target_service_score smallint,
  target_organization_score smallint,
  target_wait_score smallint,
  target_structure_score smallint,
  target_comment text default null
)
returns uuid
language sql security invoker set search_path = public, private
as $function$
  select private.submit_my_appointment_feedback(
    target_appointment_id, target_service_score, target_organization_score,
    target_wait_score, target_structure_score, target_comment
  );
$function$;

revoke execute on function public.submit_my_appointment_feedback(uuid, smallint, smallint, smallint, smallint, text) from public, anon;
grant execute on function public.submit_my_appointment_feedback(uuid, smallint, smallint, smallint, smallint, text) to authenticated;

create or replace function private.get_clinic_feedback_summary(target_clinic_id uuid default null)
returns table(
  clinic_id uuid,
  clinic_name text,
  response_count bigint,
  average_service numeric,
  average_organization numeric,
  average_wait numeric,
  average_structure numeric,
  average_overall numeric
)
language sql stable security definer set search_path = public, private
as $function$
  select
    feedback.clinic_id,
    clinic.name,
    count(*)::bigint,
    round(avg(feedback.service_score)::numeric, 2),
    round(avg(feedback.organization_score)::numeric, 2),
    round(avg(feedback.wait_score)::numeric, 2),
    round(avg(feedback.structure_score)::numeric, 2),
    round(avg((feedback.service_score + feedback.organization_score + feedback.wait_score + feedback.structure_score) / 4.0)::numeric, 2)
  from public.appointment_feedback feedback
  join public.clinics clinic on clinic.id = feedback.clinic_id
  where (target_clinic_id is null or feedback.clinic_id = target_clinic_id)
    and private.has_clinic_permission(feedback.organization_id, feedback.clinic_id, 'clinic.manage')
  group by feedback.clinic_id, clinic.name
  order by clinic.name;
$function$;

create or replace function public.get_clinic_feedback_summary(target_clinic_id uuid default null)
returns table(
  clinic_id uuid,
  clinic_name text,
  response_count bigint,
  average_service numeric,
  average_organization numeric,
  average_wait numeric,
  average_structure numeric,
  average_overall numeric
)
language sql security invoker set search_path = public, private
as $function$
  select * from private.get_clinic_feedback_summary(target_clinic_id);
$function$;

revoke execute on function public.get_clinic_feedback_summary(uuid) from public, anon;
grant execute on function public.get_clinic_feedback_summary(uuid) to authenticated;
