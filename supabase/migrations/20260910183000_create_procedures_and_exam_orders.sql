create table public.clinical_procedures (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), clinic_id uuid not null references public.clinics(id), encounter_id uuid references public.encounters(id), patient_id uuid references public.patients(id), code text not null, name text not null, status text not null default 'catalog' check (status in ('catalog','planned','performed','cancelled')), performed_at timestamptz, notes text, created_at timestamptz not null default now(), created_by uuid references auth.users(id), archived_at timestamptz
);
create index clinical_procedures_clinic_idx on public.clinical_procedures(clinic_id, created_at desc);
create index clinical_procedures_encounter_idx on public.clinical_procedures(encounter_id, created_at desc);

create table public.exam_orders (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), clinic_id uuid not null references public.clinics(id), encounter_id uuid references public.encounters(id), patient_id uuid not null references public.patients(id), exam_name text not null, status text not null default 'requested' check (status in ('requested','collected','completed','cancelled')), requested_at timestamptz not null default now(), completed_at timestamptz, result_summary text, created_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
create index exam_orders_patient_idx on public.exam_orders(patient_id, requested_at desc);
create index exam_orders_encounter_idx on public.exam_orders(encounter_id, requested_at desc);
create trigger exam_orders_updated_at before update on public.exam_orders for each row execute function private.set_updated_at();

grant select,insert,update on public.clinical_procedures, public.exam_orders to authenticated;
alter table public.clinical_procedures enable row level security;
alter table public.exam_orders enable row level security;
create policy clinical_procedures_read on public.clinical_procedures for select to authenticated using (private.has_permission(organization_id,'clinical.read'));
create policy clinical_procedures_write on public.clinical_procedures for insert to authenticated with check (private.has_permission(organization_id,'clinical.write'));
create policy clinical_procedures_update on public.clinical_procedures for update to authenticated using (private.has_permission(organization_id,'clinical.write')) with check (private.has_permission(organization_id,'clinical.write'));
create policy exam_orders_read on public.exam_orders for select to authenticated using (private.has_permission(organization_id,'clinical.read'));
create policy exam_orders_write on public.exam_orders for insert to authenticated with check (private.has_permission(organization_id,'clinical.write'));
create policy exam_orders_update on public.exam_orders for update to authenticated using (private.has_permission(organization_id,'clinical.write')) with check (private.has_permission(organization_id,'clinical.write'));
