-- Clinic scopes are revocable lifecycle records, not deletable rows.
alter table public.user_clinic_scopes add column if not exists revoked_at timestamptz;

create index if not exists user_clinic_scopes_active_idx
  on public.user_clinic_scopes (user_role_id, clinic_id)
  where revoked_at is null;

create or replace function private.has_clinic_permission(target_organization_id uuid, target_clinic_id uuid, required_permission text)
returns boolean language sql stable security definer set search_path = public, private
as $function$
  select exists (
    select 1 from public.user_roles user_role
    join public.role_permissions role_permission on role_permission.role_id = user_role.role_id
    join public.permissions permission on permission.id = role_permission.permission_id
    where user_role.user_id = (select auth.uid())
      and user_role.organization_id = target_organization_id
      and user_role.is_active
      and permission.code = required_permission
      and (
        not exists (select 1 from public.user_clinic_scopes scope where scope.user_role_id = user_role.id and scope.revoked_at is null)
        or exists (select 1 from public.user_clinic_scopes scope where scope.user_role_id = user_role.id and scope.clinic_id = target_clinic_id and scope.revoked_at is null)
      )
  );
$function$;
