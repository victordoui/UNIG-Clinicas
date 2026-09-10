-- Keep privileged RPC implementations outside the exposed API schema.
-- The public wrappers remain invoker functions so the Data API exposes only
-- the explicit entry points while the write transaction runs with the least
-- privilege needed by the caller.

create or replace function private.create_clinical_note(
  target_encounter_id uuid,
  target_note_type text,
  note_content text,
  correction_of uuid default null,
  correction_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, private
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

create or replace function public.create_clinical_note(
  target_encounter_id uuid,
  target_note_type text,
  note_content text,
  correction_of uuid default null,
  correction_reason text default null
)
returns uuid
language sql
security invoker
set search_path = public, private
as $function$
  select private.create_clinical_note(target_encounter_id, target_note_type, note_content, correction_of, correction_reason);
$function$;
revoke execute on function private.create_clinical_note(uuid, text, text, uuid, text) from public, anon;
grant execute on function private.create_clinical_note(uuid, text, text, uuid, text) to authenticated;
revoke execute on function public.create_clinical_note(uuid, text, text, uuid, text) from public, anon;
grant execute on function public.create_clinical_note(uuid, text, text, uuid, text) to authenticated;

create or replace function private.register_patient(
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
language plpgsql
security definer
set search_path = public, private
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
language sql
security invoker
set search_path = public, private
as $function$
  select private.register_patient(target_organization_id, patient_full_name, patient_record_number, patient_preferred_name, patient_document_number, patient_birth_date, patient_phone, patient_email, target_clinic_id);
$function$;
revoke execute on function private.register_patient(uuid, text, text, text, text, date, text, text, uuid) from public, anon;
grant execute on function private.register_patient(uuid, text, text, text, text, date, text, text, uuid) to authenticated;
revoke execute on function public.register_patient(uuid, text, text, text, text, date, text, text, uuid) from public, anon;
grant execute on function public.register_patient(uuid, text, text, text, text, date, text, text, uuid) to authenticated;
