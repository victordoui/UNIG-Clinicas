-- Keep document metadata and private objects behind the same patient-clinic boundary.
drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents for update to authenticated
  using (
    (patient_id is not null and private.has_patient_permission(organization_id, patient_id, 'clinical.write'))
    or (patient_id is null and encounter_id is not null and exists (
      select 1 from public.encounters encounter
      where encounter.id = documents.encounter_id
        and private.has_clinic_permission(encounter.organization_id, encounter.clinic_id, 'clinical.write')
    ))
  )
  with check (
    (patient_id is not null and private.has_patient_permission(organization_id, patient_id, 'clinical.write'))
    or (patient_id is null and encounter_id is not null and exists (
      select 1 from public.encounters encounter
      where encounter.id = documents.encounter_id
        and private.has_clinic_permission(encounter.organization_id, encounter.clinic_id, 'clinical.write')
    ))
  );

drop policy if exists storage_documents_read on storage.objects;
create policy storage_documents_read on storage.objects for select to authenticated
  using (
    bucket_id = 'clinical-documents'
    and array_length(storage.foldername(name), 1) >= 2
    and private.has_patient_permission((storage.foldername(name))[1]::uuid, (storage.foldername(name))[2]::uuid, 'clinical.read')
  );
drop policy if exists storage_documents_insert on storage.objects;
create policy storage_documents_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'clinical-documents'
    and array_length(storage.foldername(name), 1) >= 2
    and private.has_patient_permission((storage.foldername(name))[1]::uuid, (storage.foldername(name))[2]::uuid, 'clinical.write')
  );
drop policy if exists storage_documents_update on storage.objects;
create policy storage_documents_update on storage.objects for update to authenticated
  using (
    bucket_id = 'clinical-documents'
    and array_length(storage.foldername(name), 1) >= 2
    and private.has_patient_permission((storage.foldername(name))[1]::uuid, (storage.foldername(name))[2]::uuid, 'clinical.write')
  )
  with check (
    bucket_id = 'clinical-documents'
    and array_length(storage.foldername(name), 1) >= 2
    and private.has_patient_permission((storage.foldername(name))[1]::uuid, (storage.foldername(name))[2]::uuid, 'clinical.write')
  );
