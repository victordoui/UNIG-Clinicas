-- UNIG Clínicas: avoid overlapping permissive SELECT policies while preserving
-- the same authorization rules.

drop policy if exists organizations_manage on public.organizations;
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations for select to authenticated
  using (private.has_permission(id, 'organization.read') or private.has_permission(id, 'organization.manage'));
create policy organizations_insert_manage on public.organizations for insert to authenticated
  with check (private.has_permission(id, 'organization.manage'));
create policy organizations_update_manage on public.organizations for update to authenticated
  using (private.has_permission(id, 'organization.manage'))
  with check (private.has_permission(id, 'organization.manage'));
create policy organizations_delete_manage on public.organizations for delete to authenticated
  using (private.has_permission(id, 'organization.manage'));

drop policy if exists units_manage on public.units;
drop policy if exists units_select_member on public.units;
create policy units_select_member on public.units for select to authenticated
  using (private.has_permission(organization_id, 'organization.read') or private.has_permission(organization_id, 'organization.manage'));
create policy units_insert_manage on public.units for insert to authenticated
  with check (private.has_permission(organization_id, 'organization.manage'));
create policy units_update_manage on public.units for update to authenticated
  using (private.has_permission(organization_id, 'organization.manage'))
  with check (private.has_permission(organization_id, 'organization.manage'));
create policy units_delete_manage on public.units for delete to authenticated
  using (private.has_permission(organization_id, 'organization.manage'));

drop policy if exists clinics_manage on public.clinics;
drop policy if exists clinics_select_member on public.clinics;
create policy clinics_select_member on public.clinics for select to authenticated
  using (private.has_permission(organization_id, 'clinic.read') or private.has_permission(organization_id, 'clinic.manage'));
create policy clinics_insert_manage on public.clinics for insert to authenticated
  with check (private.has_permission(organization_id, 'clinic.manage'));
create policy clinics_update_manage on public.clinics for update to authenticated
  using (private.has_permission(organization_id, 'clinic.manage'))
  with check (private.has_permission(organization_id, 'clinic.manage'));
create policy clinics_delete_manage on public.clinics for delete to authenticated
  using (private.has_permission(organization_id, 'clinic.manage'));

drop policy if exists clinic_services_manage on public.clinic_services;
drop policy if exists clinic_services_select_member on public.clinic_services;
create policy clinic_services_select_member on public.clinic_services for select to authenticated
  using (exists (select 1 from public.clinics clinic where clinic.id = clinic_services.clinic_id and (private.has_permission(clinic.organization_id, 'clinic.read') or private.has_permission(clinic.organization_id, 'clinic.manage'))));
create policy clinic_services_insert_manage on public.clinic_services for insert to authenticated
  with check (exists (select 1 from public.clinics clinic where clinic.id = clinic_services.clinic_id and private.has_permission(clinic.organization_id, 'clinic.manage')));
create policy clinic_services_update_manage on public.clinic_services for update to authenticated
  using (exists (select 1 from public.clinics clinic where clinic.id = clinic_services.clinic_id and private.has_permission(clinic.organization_id, 'clinic.manage')))
  with check (exists (select 1 from public.clinics clinic where clinic.id = clinic_services.clinic_id and private.has_permission(clinic.organization_id, 'clinic.manage')));
create policy clinic_services_delete_manage on public.clinic_services for delete to authenticated
  using (exists (select 1 from public.clinics clinic where clinic.id = clinic_services.clinic_id and private.has_permission(clinic.organization_id, 'clinic.manage')));

drop policy if exists user_roles_manage on public.user_roles;
drop policy if exists user_roles_select_self_or_manager on public.user_roles;
create policy user_roles_select_self_or_manager on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or private.has_permission(organization_id, 'access.manage'));
create policy user_roles_insert_manage on public.user_roles for insert to authenticated
  with check (private.has_permission(organization_id, 'access.manage'));
create policy user_roles_update_manage on public.user_roles for update to authenticated
  using (private.has_permission(organization_id, 'access.manage'))
  with check (private.has_permission(organization_id, 'access.manage'));
create policy user_roles_delete_manage on public.user_roles for delete to authenticated
  using (private.has_permission(organization_id, 'access.manage'));

drop policy if exists user_clinic_scopes_manage on public.user_clinic_scopes;
drop policy if exists user_clinic_scopes_select_self_or_manager on public.user_clinic_scopes;
create policy user_clinic_scopes_select_self_or_manager on public.user_clinic_scopes for select to authenticated
  using (exists (select 1 from public.user_roles user_role where user_role.id = user_clinic_scopes.user_role_id and (user_role.user_id = (select auth.uid()) or private.has_permission(user_role.organization_id, 'access.manage'))));
create policy user_clinic_scopes_insert_manage on public.user_clinic_scopes for insert to authenticated
  with check (exists (select 1 from public.user_roles user_role where user_role.id = user_clinic_scopes.user_role_id and private.has_permission(user_role.organization_id, 'access.manage')));
create policy user_clinic_scopes_update_manage on public.user_clinic_scopes for update to authenticated
  using (exists (select 1 from public.user_roles user_role where user_role.id = user_clinic_scopes.user_role_id and private.has_permission(user_role.organization_id, 'access.manage')))
  with check (exists (select 1 from public.user_roles user_role where user_role.id = user_clinic_scopes.user_role_id and private.has_permission(user_role.organization_id, 'access.manage')));
create policy user_clinic_scopes_delete_manage on public.user_clinic_scopes for delete to authenticated
  using (exists (select 1 from public.user_roles user_role where user_role.id = user_clinic_scopes.user_role_id and private.has_permission(user_role.organization_id, 'access.manage')));
