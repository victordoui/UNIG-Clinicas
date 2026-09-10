-- Cover foreign keys used by lifecycle, auditing and operational queries.
create index if not exists persons_created_by_idx on public.persons (created_by) where created_by is not null;
create index if not exists persons_updated_by_idx on public.persons (updated_by) where updated_by is not null;
create index if not exists patients_person_id_idx on public.patients (person_id);
create index if not exists patients_created_by_idx on public.patients (created_by) where created_by is not null;
create index if not exists patients_updated_by_idx on public.patients (updated_by) where updated_by is not null;
create index if not exists appointments_organization_idx on public.appointments (organization_id);
create index if not exists appointments_service_idx on public.appointments (clinic_service_id) where clinic_service_id is not null;
create index if not exists appointments_cancelled_by_idx on public.appointments (cancelled_by) where cancelled_by is not null;
create index if not exists appointments_created_by_idx on public.appointments (created_by) where created_by is not null;
create index if not exists appointments_updated_by_idx on public.appointments (updated_by) where updated_by is not null;
create index if not exists queue_sessions_organization_idx on public.queue_sessions (organization_id);
create index if not exists queue_sessions_created_by_idx on public.queue_sessions (created_by) where created_by is not null;
create index if not exists queue_sessions_updated_by_idx on public.queue_sessions (updated_by) where updated_by is not null;
create index if not exists queue_tickets_patient_idx on public.queue_tickets (patient_id);
create index if not exists queue_tickets_appointment_idx on public.queue_tickets (appointment_id) where appointment_id is not null;
create index if not exists queue_tickets_created_by_idx on public.queue_tickets (created_by) where created_by is not null;
create index if not exists queue_tickets_updated_by_idx on public.queue_tickets (updated_by) where updated_by is not null;
