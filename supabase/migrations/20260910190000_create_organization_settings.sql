create table public.organization_settings (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), key text not null, value jsonb not null default 'null'::jsonb, description text, updated_at timestamptz not null default now(), updated_by uuid references auth.users(id), unique(organization_id,key)
);
create index organization_settings_org_idx on public.organization_settings(organization_id,key);
create trigger organization_settings_updated_at before update on public.organization_settings for each row execute function private.set_updated_at();
insert into public.permissions(code,name,description) values ('settings.read','Consultar configurações','Permite consultar configurações da organização.'), ('settings.manage','Gerir configurações','Permite alterar configurações da organização.') on conflict(code) do nothing;
insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r join public.permissions p on p.code in ('settings.read','settings.manage') where r.code in ('super_admin','organization_admin','clinic_manager') on conflict do nothing;
grant select,insert,update on public.organization_settings to authenticated;
alter table public.organization_settings enable row level security;
create policy organization_settings_read on public.organization_settings for select to authenticated using(private.has_permission(organization_id,'settings.read'));
create policy organization_settings_insert on public.organization_settings for insert to authenticated with check(private.has_permission(organization_id,'settings.manage'));
create policy organization_settings_update on public.organization_settings for update to authenticated using(private.has_permission(organization_id,'settings.manage')) with check(private.has_permission(organization_id,'settings.manage'));
