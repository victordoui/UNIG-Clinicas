-- Índices de auditoria e initplan para as políticas da Fase 4.
create index if not exists document_versions_created_by_idx on public.document_versions(created_by);
create index if not exists document_signatures_signer_idx on public.document_signatures(signer_user_id);

drop policy if exists document_signatures_write on public.document_signatures;
create policy document_signatures_write on public.document_signatures for insert to authenticated with check (
  signer_user_id = (select auth.uid()) and exists (
    select 1 from public.document_versions v join public.documents d on d.id = v.document_id
    where v.id = document_version_id and (
      (d.patient_id is not null and private.has_patient_permission(d.organization_id, d.patient_id, 'clinical.write'))
      or (d.patient_id is null and d.encounter_id is not null and exists (
        select 1 from public.encounters e where e.id = d.encounter_id and private.has_clinic_permission(e.organization_id, e.clinic_id, 'clinical.write')
      ))
    )
  )
);
