create or replace function private.has_clinic_permission(target_organization_id uuid, target_clinic_id uuid, required_permission text)
returns boolean language sql stable security definer set search_path = public, private
as $function$
  select exists (
    select 1 from public.user_roles user_role
    join public.role_permissions role_permission on role_permission.role_id = user_role.role_id
    join public.permissions permission on permission.id = role_permission.permission_id
    where user_role.user_id = (select auth.uid()) and user_role.organization_id = target_organization_id and user_role.is_active and permission.code = required_permission
      and (not exists (select 1 from public.user_clinic_scopes scope where scope.user_role_id = user_role.id)
        or exists (select 1 from public.user_clinic_scopes scope where scope.user_role_id = user_role.id and scope.clinic_id = target_clinic_id))
  );
$function$;
revoke execute on function private.has_clinic_permission(uuid,uuid,text) from public, anon;
grant execute on function private.has_clinic_permission(uuid,uuid,text) to authenticated;

drop policy if exists clinics_select_member on public.clinics;
create policy clinics_select_member on public.clinics for select to authenticated using (private.has_clinic_permission(organization_id,id,'clinic.read') or private.has_clinic_permission(organization_id,id,'clinic.manage'));
drop policy if exists clinics_update_manage on public.clinics;
create policy clinics_update_manage on public.clinics for update to authenticated using (private.has_clinic_permission(organization_id,id,'clinic.manage')) with check (private.has_clinic_permission(organization_id,id,'clinic.manage'));
drop policy if exists clinics_delete_manage on public.clinics;
create policy clinics_delete_manage on public.clinics for delete to authenticated using (private.has_clinic_permission(organization_id,id,'clinic.manage'));

drop policy if exists clinic_services_select_member on public.clinic_services;
create policy clinic_services_select_member on public.clinic_services for select to authenticated using (exists(select 1 from public.clinics clinic where clinic.id=clinic_services.clinic_id and (private.has_clinic_permission(clinic.organization_id,clinic.id,'clinic.read') or private.has_clinic_permission(clinic.organization_id,clinic.id,'clinic.manage'))));
drop policy if exists clinic_services_insert_manage on public.clinic_services;
create policy clinic_services_insert_manage on public.clinic_services for insert to authenticated with check (exists(select 1 from public.clinics clinic where clinic.id=clinic_services.clinic_id and private.has_clinic_permission(clinic.organization_id,clinic.id,'clinic.manage')));
drop policy if exists clinic_services_update_manage on public.clinic_services;
create policy clinic_services_update_manage on public.clinic_services for update to authenticated using (exists(select 1 from public.clinics clinic where clinic.id=clinic_services.clinic_id and private.has_clinic_permission(clinic.organization_id,clinic.id,'clinic.manage'))) with check (exists(select 1 from public.clinics clinic where clinic.id=clinic_services.clinic_id and private.has_clinic_permission(clinic.organization_id,clinic.id,'clinic.manage')));
drop policy if exists clinic_services_delete_manage on public.clinic_services;
create policy clinic_services_delete_manage on public.clinic_services for delete to authenticated using (exists(select 1 from public.clinics clinic where clinic.id=clinic_services.clinic_id and private.has_clinic_permission(clinic.organization_id,clinic.id,'clinic.manage')));

drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments for select to authenticated using (private.has_clinic_permission(organization_id,clinic_id,'appointment.read'));
drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments for insert to authenticated with check (private.has_clinic_permission(organization_id,clinic_id,'appointment.manage'));
drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments for update to authenticated using (private.has_clinic_permission(organization_id,clinic_id,'appointment.manage')) with check (private.has_clinic_permission(organization_id,clinic_id,'appointment.manage'));

drop policy if exists queue_sessions_select on public.queue_sessions;
create policy queue_sessions_select on public.queue_sessions for select to authenticated using (private.has_clinic_permission(organization_id,clinic_id,'queue.read'));
drop policy if exists queue_sessions_insert on public.queue_sessions;
create policy queue_sessions_insert on public.queue_sessions for insert to authenticated with check (private.has_clinic_permission(organization_id,clinic_id,'queue.manage'));
drop policy if exists queue_sessions_update on public.queue_sessions;
create policy queue_sessions_update on public.queue_sessions for update to authenticated using (private.has_clinic_permission(organization_id,clinic_id,'queue.manage')) with check (private.has_clinic_permission(organization_id,clinic_id,'queue.manage'));
drop policy if exists queue_tickets_select on public.queue_tickets;
create policy queue_tickets_select on public.queue_tickets for select to authenticated using (exists(select 1 from public.queue_sessions session where session.id=queue_tickets.queue_session_id and private.has_clinic_permission(session.organization_id,session.clinic_id,'queue.read')));
drop policy if exists queue_tickets_insert on public.queue_tickets;
create policy queue_tickets_insert on public.queue_tickets for insert to authenticated with check (exists(select 1 from public.queue_sessions session where session.id=queue_tickets.queue_session_id and private.has_clinic_permission(session.organization_id,session.clinic_id,'queue.manage')));
drop policy if exists queue_tickets_update on public.queue_tickets;
create policy queue_tickets_update on public.queue_tickets for update to authenticated using (exists(select 1 from public.queue_sessions session where session.id=queue_tickets.queue_session_id and private.has_clinic_permission(session.organization_id,session.clinic_id,'queue.manage'))) with check (exists(select 1 from public.queue_sessions session where session.id=queue_tickets.queue_session_id and private.has_clinic_permission(session.organization_id,session.clinic_id,'queue.manage')));

drop policy if exists encounters_read on public.encounters;
create policy encounters_read on public.encounters for select to authenticated using (private.has_clinic_permission(organization_id,clinic_id,'clinical.read'));
drop policy if exists encounters_write on public.encounters;
create policy encounters_write on public.encounters for insert to authenticated with check (private.has_clinic_permission(organization_id,clinic_id,'clinical.write'));
drop policy if exists encounters_update on public.encounters;
create policy encounters_update on public.encounters for update to authenticated using (private.has_clinic_permission(organization_id,clinic_id,'clinical.write')) with check (private.has_clinic_permission(organization_id,clinic_id,'clinical.write'));

drop policy if exists clinical_procedures_read on public.clinical_procedures;
create policy clinical_procedures_read on public.clinical_procedures for select to authenticated using (private.has_clinic_permission(organization_id,clinic_id,'clinical.read'));
drop policy if exists clinical_procedures_write on public.clinical_procedures;
create policy clinical_procedures_write on public.clinical_procedures for insert to authenticated with check (private.has_clinic_permission(organization_id,clinic_id,'clinical.write'));
drop policy if exists clinical_procedures_update on public.clinical_procedures;
create policy clinical_procedures_update on public.clinical_procedures for update to authenticated using (private.has_clinic_permission(organization_id,clinic_id,'clinical.write')) with check (private.has_clinic_permission(organization_id,clinic_id,'clinical.write'));

drop policy if exists exam_orders_read on public.exam_orders;
create policy exam_orders_read on public.exam_orders for select to authenticated using (private.has_clinic_permission(organization_id,clinic_id,'clinical.read'));
drop policy if exists exam_orders_write on public.exam_orders;
create policy exam_orders_write on public.exam_orders for insert to authenticated with check (private.has_clinic_permission(organization_id,clinic_id,'clinical.write'));
drop policy if exists exam_orders_update on public.exam_orders;
create policy exam_orders_update on public.exam_orders for update to authenticated using (private.has_clinic_permission(organization_id,clinic_id,'clinical.write')) with check (private.has_clinic_permission(organization_id,clinic_id,'clinical.write'));

drop policy if exists supervisions_read on public.student_supervisions;
create policy supervisions_read on public.student_supervisions for select to authenticated using ((student_user_id=(select auth.uid()) or supervisor_user_id=(select auth.uid()) or private.has_clinic_permission(organization_id,clinic_id,'supervision.read')));
drop policy if exists supervisions_insert on public.student_supervisions;
create policy supervisions_insert on public.student_supervisions for insert to authenticated with check (private.has_clinic_permission(organization_id,clinic_id,'supervision.manage'));
drop policy if exists supervisions_update on public.student_supervisions;
create policy supervisions_update on public.student_supervisions for update to authenticated using (private.has_clinic_permission(organization_id,clinic_id,'supervision.manage')) with check (private.has_clinic_permission(organization_id,clinic_id,'supervision.manage'));
