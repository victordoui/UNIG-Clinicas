-- UNIG Clínicas: hardening for the access-control foundation.
-- Applied remotely as migration: harden_access_foundation.

create index if not exists role_permissions_permission_idx
  on public.role_permissions (permission_id);

create index if not exists user_roles_organization_idx
  on public.user_roles (organization_id);

create index if not exists user_roles_role_idx
  on public.user_roles (role_id);

create index if not exists user_roles_assigned_by_idx
  on public.user_roles (assigned_by)
  where assigned_by is not null;

-- This event-trigger function existed before the UNIG Clínicas migration.
-- It does not need to be callable through the Data API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
