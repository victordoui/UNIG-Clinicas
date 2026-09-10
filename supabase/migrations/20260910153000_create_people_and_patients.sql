-- UNIG Clínicas: cadastro mestre de pessoas e pacientes.
-- Não armazena prontuário, evoluções ou anexos clínicos.

create table public.persons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  full_name text not null,
  preferred_name text,
  document_number text,
  birth_date date,
  email text,
  phone text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  constraint persons_document_per_organization_unique unique nulls not distinct (organization_id, document_number)
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  person_id uuid not null references public.persons(id),
  record_number text not null,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  registered_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  constraint patients_person_per_organization_unique unique (organization_id, person_id),
  constraint patients_record_per_organization_unique unique (organization_id, record_number)
);

create index persons_organization_name_idx on public.persons (organization_id, full_name);
create index patients_organization_status_idx on public.patients (organization_id, status);

create trigger persons_set_updated_at before update on public.persons
  for each row execute function private.set_updated_at();
create trigger patients_set_updated_at before update on public.patients
  for each row execute function private.set_updated_at();

insert into public.permissions (code, name, description) values
  ('patient.read', 'Consultar pacientes', 'Permite consultar pessoas e pacientes da organização.'),
  ('patient.manage', 'Gerir pacientes', 'Permite cadastrar, atualizar, inativar e arquivar pacientes da organização.')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.code in ('patient.read', 'patient.manage')
where role.code in ('super_admin', 'organization_admin', 'clinic_manager', 'receptionist')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.code = 'patient.read'
where role.code in ('clinician', 'academic_supervisor', 'student', 'auditor')
on conflict do nothing;

grant select, insert, update on public.persons, public.patients to authenticated;

alter table public.persons enable row level security;
alter table public.patients enable row level security;

create policy persons_select_reader on public.persons for select to authenticated
  using (private.has_permission(organization_id, 'patient.read'));
create policy persons_insert_manager on public.persons for insert to authenticated
  with check (private.has_permission(organization_id, 'patient.manage'));
create policy persons_update_manager on public.persons for update to authenticated
  using (private.has_permission(organization_id, 'patient.manage'))
  with check (private.has_permission(organization_id, 'patient.manage'));

create policy patients_select_reader on public.patients for select to authenticated
  using (private.has_permission(organization_id, 'patient.read'));
create policy patients_insert_manager on public.patients for insert to authenticated
  with check (private.has_permission(organization_id, 'patient.manage'));
create policy patients_update_manager on public.patients for update to authenticated
  using (private.has_permission(organization_id, 'patient.manage'))
  with check (private.has_permission(organization_id, 'patient.manage'));
