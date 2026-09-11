-- Fase 3: internação veterinária com boxes e mapa de execução.
create table if not exists public.veterinary_hospitalizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  clinic_id uuid not null references public.clinics(id),
  animal_id uuid not null references public.animals(id),
  box_code text not null,
  status text not null default 'admitted' check (status in ('admitted','discharged','cancelled')),
  admission_reason text,
  clinical_summary text,
  admitted_at timestamptz not null default now(),
  discharged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table if not exists public.veterinary_hospitalization_tasks (
  id uuid primary key default gen_random_uuid(),
  hospitalization_id uuid not null references public.veterinary_hospitalizations(id),
  task_type text not null check (task_type in ('medication','exam','procedure','parameter')),
  title text not null,
  instructions text,
  scheduled_at timestamptz not null,
  status text not null default 'planned' check (status in ('planned','completed','skipped','cancelled')),
  executed_at timestamptz,
  prescribed_by uuid references auth.users(id),
  executed_by uuid references auth.users(id),
  execution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists veterinary_hospitalizations_animal_idx on public.veterinary_hospitalizations(animal_id, admitted_at desc);
create index if not exists veterinary_hospitalizations_clinic_idx on public.veterinary_hospitalizations(clinic_id, status, admitted_at desc);
create index if not exists veterinary_hospitalization_tasks_schedule_idx on public.veterinary_hospitalization_tasks(hospitalization_id, scheduled_at);

grant select, insert, update on public.veterinary_hospitalizations, public.veterinary_hospitalization_tasks to authenticated;
alter table public.veterinary_hospitalizations enable row level security;
alter table public.veterinary_hospitalization_tasks enable row level security;

create policy veterinary_hospitalizations_read on public.veterinary_hospitalizations for select to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.read'));
create policy veterinary_hospitalizations_write on public.veterinary_hospitalizations for insert to authenticated with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
create policy veterinary_hospitalizations_update on public.veterinary_hospitalizations for update to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write')) with check (private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
create policy veterinary_hospitalization_tasks_read on public.veterinary_hospitalization_tasks for select to authenticated using (exists (select 1 from public.veterinary_hospitalizations h where h.id = hospitalization_id and private.has_clinic_permission(h.organization_id, h.clinic_id, 'specialty.read')));
create policy veterinary_hospitalization_tasks_write on public.veterinary_hospitalization_tasks for insert to authenticated with check (exists (select 1 from public.veterinary_hospitalizations h where h.id = hospitalization_id and private.has_clinic_permission(h.organization_id, h.clinic_id, 'specialty.write')));
create policy veterinary_hospitalization_tasks_update on public.veterinary_hospitalization_tasks for update to authenticated using (exists (select 1 from public.veterinary_hospitalizations h where h.id = hospitalization_id and private.has_clinic_permission(h.organization_id, h.clinic_id, 'specialty.write'))) with check (exists (select 1 from public.veterinary_hospitalizations h where h.id = hospitalization_id and private.has_clinic_permission(h.organization_id, h.clinic_id, 'specialty.write')));

create trigger veterinary_hospitalizations_updated_at before update on public.veterinary_hospitalizations for each row execute function private.set_updated_at();
create trigger veterinary_hospitalization_tasks_updated_at before update on public.veterinary_hospitalization_tasks for each row execute function private.set_updated_at();
create trigger veterinary_hospitalizations_audit_row after insert or update on public.veterinary_hospitalizations for each row execute function private.audit_row_change();
create trigger veterinary_hospitalization_tasks_audit_row after insert or update on public.veterinary_hospitalization_tasks for each row execute function private.audit_row_change();
