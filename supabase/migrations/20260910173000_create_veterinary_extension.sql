-- Veterinary extension reuses the master person registry for guardians.
create table public.animals (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  name text not null, species text not null, breed text, sex text check (sex in ('female','male','unknown')),
  birth_date date, microchip_number text, archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id), unique nulls not distinct (organization_id,microchip_number)
);
create table public.animal_guardians (
  id uuid primary key default gen_random_uuid(), animal_id uuid not null references public.animals(id), person_id uuid not null references public.persons(id),
  relationship text not null default 'guardian', is_primary boolean not null default false, created_at timestamptz not null default now(), created_by uuid references auth.users(id), unique(animal_id,person_id)
);
create unique index animal_primary_guardian_idx on public.animal_guardians(animal_id) where is_primary;
create index animals_org_name_idx on public.animals(organization_id,name);
create index animal_guardians_person_idx on public.animal_guardians(person_id);
create trigger animals_updated_at before update on public.animals for each row execute function private.set_updated_at();
grant select,insert,update on public.animals,public.animal_guardians to authenticated;
alter table public.animals enable row level security; alter table public.animal_guardians enable row level security;
create policy animals_read on public.animals for select to authenticated using(private.has_permission(organization_id,'patient.read'));
create policy animals_insert on public.animals for insert to authenticated with check(private.has_permission(organization_id,'patient.manage'));
create policy animals_update on public.animals for update to authenticated using(private.has_permission(organization_id,'patient.manage')) with check(private.has_permission(organization_id,'patient.manage'));
create policy guardians_read on public.animal_guardians for select to authenticated using(exists(select 1 from public.animals a where a.id=animal_guardians.animal_id and private.has_permission(a.organization_id,'patient.read')));
create policy guardians_insert on public.animal_guardians for insert to authenticated with check(exists(select 1 from public.animals a where a.id=animal_guardians.animal_id and private.has_permission(a.organization_id,'patient.manage')));
create policy guardians_update on public.animal_guardians for update to authenticated using(exists(select 1 from public.animals a where a.id=animal_guardians.animal_id and private.has_permission(a.organization_id,'patient.manage'))) with check(exists(select 1 from public.animals a where a.id=animal_guardians.animal_id and private.has_permission(a.organization_id,'patient.manage')));
