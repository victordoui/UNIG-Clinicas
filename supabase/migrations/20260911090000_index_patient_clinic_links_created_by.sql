-- Cover the audit actor foreign key used by patient-clinic link inserts.
create index if not exists patient_clinic_links_created_by_idx
  on public.patient_clinic_links(created_by)
  where created_by is not null;
