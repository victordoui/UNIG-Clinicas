-- Odontologia: relaciona o achado do odontograma ao plano e à execução clínica.
create table if not exists public.dental_treatment_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  clinic_id uuid not null references public.clinics(id),
  patient_id uuid not null references public.patients(id),
  odontogram_id uuid references public.dental_odontograms(id),
  status text not null default 'draft' check (status in ('draft', 'approved', 'in_progress', 'completed', 'cancelled')),
  title text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table if not exists public.dental_treatment_plan_items (
  id uuid primary key default gen_random_uuid(),
  treatment_plan_id uuid not null references public.dental_treatment_plans(id),
  odontogram_entry_id uuid references public.dental_odontogram_entries(id),
  tooth_code text not null,
  surface text,
  finding text,
  recommended_procedure text not null,
  procedure_id uuid references public.clinical_procedures(id),
  status text not null default 'planned' check (status in ('planned', 'approved', 'performed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index if not exists dental_treatment_plans_patient_idx on public.dental_treatment_plans(patient_id, updated_at desc);
create index if not exists dental_treatment_plans_clinic_idx on public.dental_treatment_plans(clinic_id, updated_at desc);
create index if not exists dental_treatment_plan_items_plan_idx on public.dental_treatment_plan_items(treatment_plan_id, created_at);
create index if not exists dental_treatment_plan_items_entry_idx on public.dental_treatment_plan_items(odontogram_entry_id);

grant select, insert, update on public.dental_treatment_plans, public.dental_treatment_plan_items to authenticated;
alter table public.dental_treatment_plans enable row level security;
alter table public.dental_treatment_plan_items enable row level security;

create policy dental_treatment_plans_read on public.dental_treatment_plans
  for select to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.read'));
create policy dental_treatment_plans_write on public.dental_treatment_plans
  for insert to authenticated with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
create policy dental_treatment_plans_update on public.dental_treatment_plans
  for update to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'))
  with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));

create policy dental_treatment_plan_items_read on public.dental_treatment_plan_items
  for select to authenticated using (
    exists (select 1 from public.dental_treatment_plans plan where plan.id = treatment_plan_id
      and private.has_clinic_permission(plan.organization_id, plan.clinic_id, 'specialty.read'))
  );
create policy dental_treatment_plan_items_write on public.dental_treatment_plan_items
  for insert to authenticated with check (
    exists (select 1 from public.dental_treatment_plans plan where plan.id = treatment_plan_id
      and private.has_clinic_permission(plan.organization_id, plan.clinic_id, 'specialty.write'))
  );
create policy dental_treatment_plan_items_update on public.dental_treatment_plan_items
  for update to authenticated using (
    exists (select 1 from public.dental_treatment_plans plan where plan.id = treatment_plan_id
      and private.has_clinic_permission(plan.organization_id, plan.clinic_id, 'specialty.write'))
  ) with check (
    exists (select 1 from public.dental_treatment_plans plan where plan.id = treatment_plan_id
      and private.has_clinic_permission(plan.organization_id, plan.clinic_id, 'specialty.write'))
  );

create trigger dental_treatment_plans_updated_at before update on public.dental_treatment_plans for each row execute function private.set_updated_at();
create trigger dental_treatment_plan_items_updated_at before update on public.dental_treatment_plan_items for each row execute function private.set_updated_at();
create trigger dental_treatment_plans_audit_row after insert or update on public.dental_treatment_plans for each row execute function private.audit_row_change();
create trigger dental_treatment_plan_items_audit_row after insert or update on public.dental_treatment_plan_items for each row execute function private.audit_row_change();
