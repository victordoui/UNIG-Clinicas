-- UNIG Clínicas: extend clinic scoping to patient and veterinary data.
-- A patient can be served by more than one clinic, so access is modeled as a
-- many-to-many relationship instead of duplicating the patient registry.

create table if not exists public.patient_clinic_links (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  clinic_id uuid not null references public.clinics(id),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  constraint patient_clinic_links_unique unique (patient_id, clinic_id)
);

create index if not exists patient_clinic_links_patient_idx
  on public.patient_clinic_links (patient_id, clinic_id);
create index if not exists patient_clinic_links_clinic_idx
  on public.patient_clinic_links (clinic_id, patient_id);

grant select, insert, update on public.patient_clinic_links to authenticated;
alter table public.patient_clinic_links enable row level security;

create or replace function private.has_unscoped_permission(target_organization_id uuid, required_permission text)
returns boolean
language sql stable security definer set search_path = public, private
as $function$
  select exists (
    select 1
    from public.user_roles user_role
    join public.role_permissions role_permission on role_permission.role_id = user_role.role_id
    join public.permissions permission on permission.id = role_permission.permission_id
    where user_role.user_id = (select auth.uid())
      and user_role.organization_id = target_organization_id
      and user_role.is_active
      and permission.code = required_permission
      and not exists (
        select 1 from public.user_clinic_scopes scope
        where scope.user_role_id = user_role.id
      )
  );
$function$;

create or replace function private.has_patient_permission(target_organization_id uuid, target_patient_id uuid, required_permission text)
returns boolean
language sql stable security definer set search_path = public, private
as $function$
  select exists (
    select 1
    from public.user_roles user_role
    join public.role_permissions role_permission on role_permission.role_id = user_role.role_id
    join public.permissions permission on permission.id = role_permission.permission_id
    where user_role.user_id = (select auth.uid())
      and user_role.organization_id = target_organization_id
      and user_role.is_active
      and permission.code = required_permission
      and (
        not exists (
          select 1 from public.user_clinic_scopes scope
          where scope.user_role_id = user_role.id
        )
        or exists (
          select 1
          from public.user_clinic_scopes scope
          join public.patient_clinic_links link on link.clinic_id = scope.clinic_id
          join public.clinics clinic on clinic.id = link.clinic_id
          where scope.user_role_id = user_role.id
            and scope.revoked_at is null
            and link.patient_id = target_patient_id
            and clinic.organization_id = target_organization_id
        )
      )
  );
$function$;

revoke execute on function private.has_unscoped_permission(uuid, text) from public, anon;
revoke execute on function private.has_patient_permission(uuid, uuid, text) from public, anon;
grant execute on function private.has_unscoped_permission(uuid, text) to authenticated;
grant execute on function private.has_patient_permission(uuid, uuid, text) to authenticated;

drop policy if exists patient_clinic_links_select on public.patient_clinic_links;
create policy patient_clinic_links_select on public.patient_clinic_links
  for select to authenticated
  using (private.has_clinic_permission(
    (select clinic.organization_id from public.clinics clinic where clinic.id = patient_clinic_links.clinic_id),
    patient_clinic_links.clinic_id,
    'clinic.read'
  ));

drop policy if exists patient_clinic_links_insert on public.patient_clinic_links;
create policy patient_clinic_links_insert on public.patient_clinic_links
  for insert to authenticated
  with check (private.has_clinic_permission(
    (select clinic.organization_id from public.clinics clinic where clinic.id = patient_clinic_links.clinic_id),
    patient_clinic_links.clinic_id,
    'patient.manage'
  ));

drop policy if exists patient_clinic_links_update on public.patient_clinic_links;
create policy patient_clinic_links_update on public.patient_clinic_links
  for update to authenticated
  using (private.has_clinic_permission(
    (select clinic.organization_id from public.clinics clinic where clinic.id = patient_clinic_links.clinic_id),
    patient_clinic_links.clinic_id,
    'patient.manage'
  ))
  with check (private.has_clinic_permission(
    (select clinic.organization_id from public.clinics clinic where clinic.id = patient_clinic_links.clinic_id),
    patient_clinic_links.clinic_id,
    'patient.manage'
  ));

-- Existing clinical relationships become the initial clinic links.
insert into public.patient_clinic_links (patient_id, clinic_id)
select distinct source.patient_id, source.clinic_id
from (
  select patient_id, clinic_id from public.appointments
  union all select patient_id, clinic_id from public.encounters
  union all select patient_id, clinic_id from public.clinical_procedures
  union all select patient_id, clinic_id from public.exam_orders
) source
where source.patient_id is not null
on conflict (patient_id, clinic_id) do nothing;

create or replace function private.link_patient_to_clinic()
returns trigger
language plpgsql security definer set search_path = public, private
as $function$
begin
  if new.patient_id is not null and new.clinic_id is not null then
    insert into public.patient_clinic_links (patient_id, clinic_id, created_by)
    values (new.patient_id, new.clinic_id, (select auth.uid()))
    on conflict (patient_id, clinic_id) do nothing;
  end if;
  return new;
end;
$function$;

drop trigger if exists appointments_link_patient_clinic on public.appointments;
create trigger appointments_link_patient_clinic
  after insert on public.appointments
  for each row execute function private.link_patient_to_clinic();
drop trigger if exists encounters_link_patient_clinic on public.encounters;
create trigger encounters_link_patient_clinic
  after insert on public.encounters
  for each row execute function private.link_patient_to_clinic();
drop trigger if exists procedures_link_patient_clinic on public.clinical_procedures;
create trigger procedures_link_patient_clinic
  after insert on public.clinical_procedures
  for each row execute function private.link_patient_to_clinic();
drop trigger if exists exams_link_patient_clinic on public.exam_orders;
create trigger exams_link_patient_clinic
  after insert on public.exam_orders
  for each row execute function private.link_patient_to_clinic();

drop policy if exists persons_select_reader on public.persons;
create policy persons_select_reader on public.persons for select to authenticated
  using (exists (
    select 1 from public.patients patient
    where patient.person_id = persons.id
      and private.has_patient_permission(persons.organization_id, patient.id, 'patient.read')
  ));
drop policy if exists persons_insert_manager on public.persons;
create policy persons_insert_manager on public.persons for insert to authenticated
  with check (private.has_unscoped_permission(organization_id, 'patient.manage'));
drop policy if exists persons_update_manager on public.persons;
create policy persons_update_manager on public.persons for update to authenticated
  using (exists (
    select 1 from public.patients patient
    where patient.person_id = persons.id
      and private.has_patient_permission(persons.organization_id, patient.id, 'patient.manage')
  ))
  with check (exists (
    select 1 from public.patients patient
    where patient.person_id = persons.id
      and private.has_patient_permission(persons.organization_id, patient.id, 'patient.manage')
  ));

drop policy if exists patients_select_reader on public.patients;
create policy patients_select_reader on public.patients for select to authenticated
  using (private.has_patient_permission(organization_id, id, 'patient.read'));
drop policy if exists patients_insert_manager on public.patients;
create policy patients_insert_manager on public.patients for insert to authenticated
  with check (private.has_unscoped_permission(organization_id, 'patient.manage'));
drop policy if exists patients_update_manager on public.patients;
create policy patients_update_manager on public.patients for update to authenticated
  using (private.has_patient_permission(organization_id, id, 'patient.manage'))
  with check (private.has_patient_permission(organization_id, id, 'patient.manage'));

-- Veterinary records carry their own clinic boundary.
alter table public.animals add column if not exists clinic_id uuid references public.clinics(id);
create index if not exists animals_clinic_name_idx on public.animals (clinic_id, name);
update public.animals animal
set clinic_id = clinic.id
from public.clinics clinic
where clinic.code = 'VET' and animal.clinic_id is null;

drop policy if exists animals_read on public.animals;
create policy animals_read on public.animals for select to authenticated
  using (private.has_clinic_permission(
    (select clinic.organization_id from public.clinics clinic where clinic.id = animals.clinic_id),
    clinic_id,
    'patient.read'
  ));
drop policy if exists animals_insert on public.animals;
create policy animals_insert on public.animals for insert to authenticated
  with check (private.has_clinic_permission(
    (select clinic.organization_id from public.clinics clinic where clinic.id = animals.clinic_id),
    clinic_id,
    'patient.manage'
  ));
drop policy if exists animals_update on public.animals;
create policy animals_update on public.animals for update to authenticated
  using (private.has_clinic_permission(
    (select clinic.organization_id from public.clinics clinic where clinic.id = animals.clinic_id),
    clinic_id,
    'patient.manage'
  ))
  with check (private.has_clinic_permission(
    (select clinic.organization_id from public.clinics clinic where clinic.id = animals.clinic_id),
    clinic_id,
    'patient.manage'
  ));

drop policy if exists guardians_read on public.animal_guardians;
create policy guardians_read on public.animal_guardians for select to authenticated
  using (exists (
    select 1 from public.animals animal
    where animal.id = animal_guardians.animal_id
      and private.has_clinic_permission(
        (select clinic.organization_id from public.clinics clinic where clinic.id = animal.clinic_id),
        animal.clinic_id,
        'patient.read'
      )
  ));
drop policy if exists guardians_insert on public.animal_guardians;
create policy guardians_insert on public.animal_guardians for insert to authenticated
  with check (exists (
    select 1 from public.animals animal
    where animal.id = animal_guardians.animal_id
      and private.has_clinic_permission(
        (select clinic.organization_id from public.clinics clinic where clinic.id = animal.clinic_id),
        animal.clinic_id,
        'patient.manage'
      )
  ));
drop policy if exists guardians_update on public.animal_guardians;
create policy guardians_update on public.animal_guardians for update to authenticated
  using (exists (
    select 1 from public.animals animal
    where animal.id = animal_guardians.animal_id
      and private.has_clinic_permission(
        (select clinic.organization_id from public.clinics clinic where clinic.id = animal.clinic_id),
        animal.clinic_id,
        'patient.manage'
      )
  ))
  with check (exists (
    select 1 from public.animals animal
    where animal.id = animal_guardians.animal_id
      and private.has_clinic_permission(
        (select clinic.organization_id from public.clinics clinic where clinic.id = animal.clinic_id),
        animal.clinic_id,
        'patient.manage'
      )
  ));

drop policy if exists records_read on public.clinical_records;
create policy records_read on public.clinical_records for select to authenticated
  using (private.has_patient_permission(organization_id, patient_id, 'clinical.read'));

drop policy if exists notes_read on public.clinical_notes;
create policy notes_read on public.clinical_notes for select to authenticated
  using (exists (
    select 1 from public.clinical_records record
    where record.id = clinical_notes.clinical_record_id
      and private.has_patient_permission(record.organization_id, record.patient_id, 'clinical.read')
  ));

drop policy if exists versions_read on public.clinical_note_versions;
create policy versions_read on public.clinical_note_versions for select to authenticated
  using (exists (
    select 1
    from public.clinical_notes note
    join public.clinical_records record on record.id = note.clinical_record_id
    where note.id = clinical_note_versions.clinical_note_id
      and private.has_patient_permission(record.organization_id, record.patient_id, 'clinical.read')
  ));

drop policy if exists consents_read on public.consents;
create policy consents_read on public.consents for select to authenticated
  using (private.has_patient_permission(organization_id, patient_id, 'clinical.read'));
drop policy if exists consents_write on public.consents;
create policy consents_write on public.consents for insert to authenticated
  with check (private.has_patient_permission(organization_id, patient_id, 'clinical.write'));
drop policy if exists consents_update on public.consents;
create policy consents_update on public.consents for update to authenticated
  using (private.has_patient_permission(organization_id, patient_id, 'clinical.write'))
  with check (private.has_patient_permission(organization_id, patient_id, 'clinical.write'));

drop policy if exists documents_read on public.documents;
create policy documents_read on public.documents for select to authenticated
  using (
    (patient_id is not null and private.has_patient_permission(organization_id, patient_id, 'clinical.read'))
    or (patient_id is null and encounter_id is not null and exists (
      select 1 from public.encounters encounter
      where encounter.id = documents.encounter_id
        and private.has_clinic_permission(encounter.organization_id, encounter.clinic_id, 'clinical.read')
    ))
  );
drop policy if exists documents_write on public.documents;
create policy documents_write on public.documents for insert to authenticated
  with check (
    (patient_id is not null and private.has_patient_permission(organization_id, patient_id, 'clinical.write'))
    or (patient_id is null and encounter_id is not null and exists (
      select 1 from public.encounters encounter
      where encounter.id = documents.encounter_id
        and private.has_clinic_permission(encounter.organization_id, encounter.clinic_id, 'clinical.write')
    ))
  );

-- Clinical note creation must check the encounter's clinic, not only the organization.
create or replace function public.create_clinical_note(target_encounter_id uuid, target_note_type text, note_content text, correction_of uuid default null, correction_reason text default null)
returns uuid
language plpgsql security definer set search_path = public, private
as $function$
declare
  org_id uuid;
  clinic_id_value uuid;
  patient_id_value uuid;
  record_id uuid;
  note_id uuid;
begin
  select organization_id, clinic_id, patient_id
    into org_id, clinic_id_value, patient_id_value
  from public.encounters
  where id = target_encounter_id;
  if org_id is null then raise exception 'Atendimento não encontrado'; end if;
  if not private.has_clinic_permission(org_id, clinic_id_value, 'clinical.write') then
    raise exception 'Sem permissão clínica para esta clínica';
  end if;
  select id into record_id from public.clinical_records
    where organization_id = org_id and patient_id = patient_id_value;
  if record_id is null then
    insert into public.clinical_records(organization_id, patient_id, created_by)
      values(org_id, patient_id_value, auth.uid()) returning id into record_id;
  end if;
  insert into public.clinical_notes(clinical_record_id, encounter_id, supersedes_note_id, note_type, content, author_id)
    values(record_id, target_encounter_id, correction_of, target_note_type, note_content, auth.uid()) returning id into note_id;
  insert into public.clinical_note_versions(clinical_note_id, version_number, content, reason, author_id)
    values(note_id, 1, note_content, correction_reason, auth.uid());
  insert into public.audit_logs(organization_id, actor_id, action, entity_table, entity_id, metadata)
    values(org_id, auth.uid(), 'clinical_note.created', 'clinical_notes', note_id,
      jsonb_build_object('encounter_id', target_encounter_id, 'note_type', target_note_type));
  return note_id;
end;
$function$;

-- Registration is clinic-aware so a scoped receptionist cannot create an orphan patient.
drop function if exists public.register_patient(uuid, text, text, text, text, date, text, text);
create or replace function public.register_patient(
  target_organization_id uuid,
  patient_full_name text,
  patient_record_number text,
  patient_preferred_name text default null,
  patient_document_number text default null,
  patient_birth_date date default null,
  patient_phone text default null,
  patient_email text default null,
  target_clinic_id uuid default null
)
returns uuid
language plpgsql security definer set search_path = public, private
as $function$
declare
  new_person_id uuid;
  new_patient_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Sessão obrigatória'; end if;
  if target_clinic_id is null or not private.has_clinic_permission(target_organization_id, target_clinic_id, 'patient.manage') then
    raise exception 'Sem permissão para cadastrar paciente nesta clínica';
  end if;
  if not exists (select 1 from public.clinics clinic where clinic.id = target_clinic_id and clinic.organization_id = target_organization_id and clinic.is_active) then
    raise exception 'Clínica inválida';
  end if;
  insert into public.persons (organization_id, full_name, preferred_name, document_number, birth_date, phone, email, created_by, updated_by)
    values (target_organization_id, patient_full_name, patient_preferred_name, patient_document_number, patient_birth_date, patient_phone, patient_email, auth.uid(), auth.uid())
    returning id into new_person_id;
  insert into public.patients (organization_id, person_id, record_number, status, created_by, updated_by)
    values (target_organization_id, new_person_id, patient_record_number, 'active', auth.uid(), auth.uid())
    returning id into new_patient_id;
  insert into public.patient_clinic_links (patient_id, clinic_id, created_by)
    values (new_patient_id, target_clinic_id, auth.uid())
    on conflict (patient_id, clinic_id) do nothing;
  return new_patient_id;
end;
$function$;

revoke execute on function public.register_patient(uuid, text, text, text, text, date, text, text, uuid) from public, anon;
grant execute on function public.register_patient(uuid, text, text, text, text, date, text, text, uuid) to authenticated;
