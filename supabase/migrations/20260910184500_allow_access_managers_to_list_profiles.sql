create policy profiles_select_access_managers on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1 from public.user_roles managed_user_role
    where managed_user_role.user_id = profiles.id
      and managed_user_role.is_active = true
      and private.has_permission(managed_user_role.organization_id, 'access.manage')
  )
);
