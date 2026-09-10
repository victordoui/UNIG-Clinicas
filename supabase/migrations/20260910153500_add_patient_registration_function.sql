-- Atomic registration prevents orphan person records when patient creation fails.
create function public.register_patient(
  target_organization_id uuid,
  patient_full_name text,
  patient_record_number text,
  patient_preferred_name text default null,
  patient_document_number text default null,
  patient_birth_date date default null,
  patient_phone text default null,
  patient_email text default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_person_id uuid;
  new_patient_id uuid;
begin
  insert into public.persons (
    organization_id, full_name, preferred_name, document_number, birth_date, phone, email, created_by, updated_by
  ) values (
    target_organization_id, patient_full_name, patient_preferred_name, patient_document_number, patient_birth_date, patient_phone, patient_email, auth.uid(), auth.uid()
  ) returning id into new_person_id;

  insert into public.patients (
    organization_id, person_id, record_number, status, created_by, updated_by
  ) values (
    target_organization_id, new_person_id, patient_record_number, 'active', auth.uid(), auth.uid()
  ) returning id into new_patient_id;

  return new_patient_id;
end;
$$;

revoke execute on function public.register_patient(uuid, text, text, text, text, date, text, text) from public, anon;
grant execute on function public.register_patient(uuid, text, text, text, text, date, text, text) to authenticated;
