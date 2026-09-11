-- Avaliação pós-consulta veterinária pelo tutor. A consulta é o atendimento
-- clínico de referência para animais e não compartilha o identificador de
-- agenda do paciente humano.

create table public.veterinary_consultation_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  clinic_id uuid not null references public.clinics(id),
  consultation_id uuid not null unique references public.veterinary_consultations(id),
  animal_id uuid not null references public.animals(id),
  service_score smallint not null check (service_score between 1 and 5),
  organization_score smallint not null check (organization_score between 1 and 5),
  wait_score smallint not null check (wait_score between 1 and 5),
  structure_score smallint not null check (structure_score between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1500),
  submitted_at timestamptz not null default now()
);

create index veterinary_feedback_clinic_submitted_idx
  on public.veterinary_consultation_feedback(clinic_id, submitted_at desc);

alter table public.veterinary_consultation_feedback enable row level security;
revoke all on public.veterinary_consultation_feedback from anon, authenticated;
revoke delete on public.veterinary_consultation_feedback from anon, authenticated;

create or replace function private.get_my_tutor_feedback_candidates()
returns table(
  consultation_id uuid,
  consultation_at timestamptz,
  animal_name text,
  clinic_name text,
  feedback_submitted boolean
)
language sql stable security definer set search_path = public, private
as $function$
  select
    consultation.id,
    consultation.created_at,
    animal.name,
    clinic.name,
    exists (
      select 1 from public.veterinary_consultation_feedback feedback
      where feedback.consultation_id = consultation.id
    )
  from public.profiles profile
  join public.animal_guardians guardian on guardian.person_id = profile.person_id
  join public.animals animal on animal.id = guardian.animal_id
  join public.veterinary_consultations consultation on consultation.animal_id = animal.id
  join public.clinics clinic on clinic.id = consultation.clinic_id
  where profile.id = (select auth.uid())
    and private.has_role_code('tutor')
  order by consultation.created_at desc
  limit 20;
$function$;

create or replace function public.get_my_tutor_feedback_candidates()
returns table(
  consultation_id uuid,
  consultation_at timestamptz,
  animal_name text,
  clinic_name text,
  feedback_submitted boolean
)
language sql security invoker set search_path = public, private
as $function$
  select * from private.get_my_tutor_feedback_candidates();
$function$;

revoke execute on function public.get_my_tutor_feedback_candidates() from public, anon;
grant execute on function public.get_my_tutor_feedback_candidates() to authenticated;

create or replace function private.submit_my_tutor_consultation_feedback(
  target_consultation_id uuid,
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
  consultation_row public.veterinary_consultations;
  new_feedback_id uuid;
begin
  if (select auth.uid()) is null or not private.has_role_code('tutor') then
    raise exception 'A avaliação está disponível apenas para a conta do tutor';
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

  select consultation.* into consultation_row
  from public.veterinary_consultations consultation
  join public.animals animal on animal.id = consultation.animal_id
  join public.animal_guardians guardian on guardian.animal_id = animal.id
  join public.profiles profile on profile.person_id = guardian.person_id
  where consultation.id = target_consultation_id
    and profile.id = (select auth.uid())
  for update of consultation;

  if consultation_row.id is null then
    raise exception 'Consulta veterinária não encontrada para seus animais';
  end if;

  insert into public.veterinary_consultation_feedback(
    organization_id, clinic_id, consultation_id, animal_id,
    service_score, organization_score, wait_score, structure_score, comment
  ) values (
    consultation_row.organization_id, consultation_row.clinic_id,
    consultation_row.id, consultation_row.animal_id,
    target_service_score, target_organization_score, target_wait_score,
    target_structure_score, nullif(trim(target_comment), '')
  ) returning id into new_feedback_id;

  insert into public.audit_logs(
    organization_id, actor_id, action, entity_table, entity_id, metadata
  ) values (
    consultation_row.organization_id, (select auth.uid()),
    'veterinary_consultation_feedback.created', 'veterinary_consultation_feedback', new_feedback_id,
    jsonb_build_object('consultation_id', consultation_row.id, 'clinic_id', consultation_row.clinic_id)
  );

  return new_feedback_id;
exception
  when unique_violation then
    raise exception 'Esta consulta já recebeu uma avaliação';
end;
$function$;

create or replace function public.submit_my_tutor_consultation_feedback(
  target_consultation_id uuid,
  target_service_score smallint,
  target_organization_score smallint,
  target_wait_score smallint,
  target_structure_score smallint,
  target_comment text default null
)
returns uuid
language sql security invoker set search_path = public, private
as $function$
  select private.submit_my_tutor_consultation_feedback(
    target_consultation_id, target_service_score, target_organization_score,
    target_wait_score, target_structure_score, target_comment
  );
$function$;

revoke execute on function public.submit_my_tutor_consultation_feedback(uuid, smallint, smallint, smallint, smallint, text) from public, anon;
grant execute on function public.submit_my_tutor_consultation_feedback(uuid, smallint, smallint, smallint, smallint, text) to authenticated;

-- Amplia o resumo da migration anterior com as respostas de tutores, sempre
-- respeitando o escopo da clínica que o gestor pode administrar.
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
  with all_feedback as (
    select organization_id, clinic_id, service_score, organization_score, wait_score, structure_score
    from public.appointment_feedback
    union all
    select organization_id, clinic_id, service_score, organization_score, wait_score, structure_score
    from public.veterinary_consultation_feedback
  )
  select
    feedback.clinic_id,
    clinic.name,
    count(*)::bigint,
    round(avg(feedback.service_score)::numeric, 2),
    round(avg(feedback.organization_score)::numeric, 2),
    round(avg(feedback.wait_score)::numeric, 2),
    round(avg(feedback.structure_score)::numeric, 2),
    round(avg((feedback.service_score + feedback.organization_score + feedback.wait_score + feedback.structure_score) / 4.0)::numeric, 2)
  from all_feedback feedback
  join public.clinics clinic on clinic.id = feedback.clinic_id
  where (target_clinic_id is null or feedback.clinic_id = target_clinic_id)
    and private.has_clinic_permission(feedback.organization_id, feedback.clinic_id, 'clinic.manage')
  group by feedback.clinic_id, clinic.name
  order by clinic.name;
$function$;
