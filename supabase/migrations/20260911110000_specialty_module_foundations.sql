-- Ciclo 8: módulos de especialidade separados, ligados ao encounter comum.
create table if not exists public.dental_odontograms (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), clinic_id uuid not null references public.clinics(id), patient_id uuid not null references public.patients(id), encounter_id uuid references public.encounters(id), status text not null default 'active' check (status in ('active','archived')), notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id)
);
create table if not exists public.dental_odontogram_entries (
  id uuid primary key default gen_random_uuid(), odontogram_id uuid not null references public.dental_odontograms(id), tooth_code text not null, surface text, condition text not null, notes text, recorded_at timestamptz not null default now(), recorded_by uuid references auth.users(id), unique (odontogram_id, tooth_code, surface)
);
create index if not exists dental_odontograms_patient_idx on public.dental_odontograms(patient_id, updated_at desc);
create index if not exists dental_odontogram_entries_odontogram_idx on public.dental_odontogram_entries(odontogram_id, tooth_code);

create table if not exists public.physiotherapy_assessments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), clinic_id uuid not null references public.clinics(id), patient_id uuid not null references public.patients(id), encounter_id uuid references public.encounters(id), chief_complaint text, functional_assessment jsonb not null default '{}'::jsonb, physiotherapy_diagnosis text, therapeutic_plan text, status text not null default 'active' check (status in ('active','discharged','cancelled')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id)
);
create table if not exists public.physiotherapy_sessions (
  id uuid primary key default gen_random_uuid(), assessment_id uuid not null references public.physiotherapy_assessments(id), encounter_id uuid references public.encounters(id), session_number integer not null check (session_number > 0), status text not null default 'planned' check (status in ('planned','completed','cancelled')), goals text, exercise_plan text, reassessment text, session_date timestamptz not null default now(), created_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create index if not exists physiotherapy_assessments_patient_idx on public.physiotherapy_assessments(patient_id, updated_at desc);
create index if not exists physiotherapy_sessions_assessment_idx on public.physiotherapy_sessions(assessment_id, session_number);

create table if not exists public.aesthetic_protocols (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), clinic_id uuid not null references public.clinics(id), name text not null, description text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id)
);
create table if not exists public.aesthetic_sessions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), clinic_id uuid not null references public.clinics(id), patient_id uuid not null references public.patients(id), encounter_id uuid references public.encounters(id), protocol_id uuid references public.aesthetic_protocols(id), session_number integer not null default 1 check (session_number > 0), regions jsonb not null default '[]'::jsonb, products jsonb not null default '[]'::jsonb, photo_consent boolean not null default false, result_notes text, session_date timestamptz not null default now(), created_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create index if not exists aesthetic_sessions_patient_idx on public.aesthetic_sessions(patient_id, session_date desc);
create index if not exists aesthetic_protocols_clinic_idx on public.aesthetic_protocols(clinic_id, active);

create table if not exists public.veterinary_consultations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), clinic_id uuid not null references public.clinics(id), animal_id uuid not null references public.animals(id), encounter_id uuid references public.encounters(id), chief_complaint text, diagnosis text, prescription text, observations text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id)
);
create table if not exists public.veterinary_weights (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), clinic_id uuid not null references public.clinics(id), animal_id uuid not null references public.animals(id), encounter_id uuid references public.encounters(id), weight_kg numeric(8,3) not null check (weight_kg > 0), measured_at timestamptz not null default now(), notes text, created_by uuid references auth.users(id)
);
create table if not exists public.veterinary_vaccinations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), clinic_id uuid not null references public.clinics(id), animal_id uuid not null references public.animals(id), vaccine_name text not null, dose text, administered_at date not null, next_due_at date, veterinarian_notes text, created_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create index if not exists veterinary_consultations_animal_idx on public.veterinary_consultations(animal_id, created_at desc);
create index if not exists veterinary_weights_animal_idx on public.veterinary_weights(animal_id, measured_at desc);
create index if not exists veterinary_vaccinations_animal_idx on public.veterinary_vaccinations(animal_id, administered_at desc);

insert into public.permissions(code, name, description) values
  ('specialty.read','Consultar módulos de especialidade','Permite consultar dados específicos da clínica.'),
  ('specialty.write','Registrar dados de especialidade','Permite registrar dados específicos da clínica.')
on conflict (code) do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.code in ('specialty.read','specialty.write') where r.code in ('super_admin','organization_admin','clinic_manager','clinician','academic_supervisor') on conflict do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.code='specialty.read' where r.code in ('student','receptionist','auditor') on conflict do nothing;

grant select, insert, update on public.dental_odontograms, public.dental_odontogram_entries, public.physiotherapy_assessments, public.physiotherapy_sessions, public.aesthetic_protocols, public.aesthetic_sessions, public.veterinary_consultations, public.veterinary_weights, public.veterinary_vaccinations to authenticated;
alter table public.dental_odontograms enable row level security; alter table public.dental_odontogram_entries enable row level security;
alter table public.physiotherapy_assessments enable row level security; alter table public.physiotherapy_sessions enable row level security;
alter table public.aesthetic_protocols enable row level security; alter table public.aesthetic_sessions enable row level security;
alter table public.veterinary_consultations enable row level security; alter table public.veterinary_weights enable row level security; alter table public.veterinary_vaccinations enable row level security;

create policy dental_odontograms_read on public.dental_odontograms for select to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.read'));
create policy dental_odontograms_write on public.dental_odontograms for insert to authenticated with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
create policy dental_odontograms_update on public.dental_odontograms for update to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write')) with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
create policy dental_entries_read on public.dental_odontogram_entries for select to authenticated using (exists(select 1 from public.dental_odontograms o where o.id=odontogram_id and private.has_clinic_permission(o.organization_id,o.clinic_id,'specialty.read')));
create policy dental_entries_write on public.dental_odontogram_entries for insert to authenticated with check (exists(select 1 from public.dental_odontograms o where o.id=odontogram_id and private.has_clinic_permission(o.organization_id,o.clinic_id,'specialty.write')));
create policy dental_entries_update on public.dental_odontogram_entries for update to authenticated using (exists(select 1 from public.dental_odontograms o where o.id=odontogram_id and private.has_clinic_permission(o.organization_id,o.clinic_id,'specialty.write'))) with check (exists(select 1 from public.dental_odontograms o where o.id=odontogram_id and private.has_clinic_permission(o.organization_id,o.clinic_id,'specialty.write')));

create policy physio_assessments_read on public.physiotherapy_assessments for select to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.read'));
create policy physio_assessments_write on public.physiotherapy_assessments for insert to authenticated with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
create policy physio_assessments_update on public.physiotherapy_assessments for update to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write')) with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
create policy physio_sessions_read on public.physiotherapy_sessions for select to authenticated using (exists(select 1 from public.physiotherapy_assessments a where a.id=assessment_id and private.has_clinic_permission(a.organization_id,a.clinic_id,'specialty.read')));
create policy physio_sessions_write on public.physiotherapy_sessions for insert to authenticated with check (exists(select 1 from public.physiotherapy_assessments a where a.id=assessment_id and private.has_clinic_permission(a.organization_id,a.clinic_id,'specialty.write')));
create policy physio_sessions_update on public.physiotherapy_sessions for update to authenticated using (exists(select 1 from public.physiotherapy_assessments a where a.id=assessment_id and private.has_clinic_permission(a.organization_id,a.clinic_id,'specialty.write'))) with check (exists(select 1 from public.physiotherapy_assessments a where a.id=assessment_id and private.has_clinic_permission(a.organization_id,a.clinic_id,'specialty.write')));

create policy aesthetic_protocols_read on public.aesthetic_protocols for select to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.read'));
create policy aesthetic_protocols_write on public.aesthetic_protocols for insert to authenticated with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
create policy aesthetic_protocols_update on public.aesthetic_protocols for update to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write')) with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
create policy aesthetic_sessions_read on public.aesthetic_sessions for select to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.read'));
create policy aesthetic_sessions_write on public.aesthetic_sessions for insert to authenticated with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
create policy aesthetic_sessions_update on public.aesthetic_sessions for update to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write')) with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));

create policy vet_consultations_read on public.veterinary_consultations for select to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.read'));
create policy vet_consultations_write on public.veterinary_consultations for insert to authenticated with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
create policy vet_consultations_update on public.veterinary_consultations for update to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write')) with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
create policy vet_weights_read on public.veterinary_weights for select to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.read'));
create policy vet_weights_write on public.veterinary_weights for insert to authenticated with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
create policy vet_weights_update on public.veterinary_weights for update to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write')) with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
create policy vet_vaccinations_read on public.veterinary_vaccinations for select to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.read'));
create policy vet_vaccinations_write on public.veterinary_vaccinations for insert to authenticated with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
create policy vet_vaccinations_update on public.veterinary_vaccinations for update to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write')) with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
