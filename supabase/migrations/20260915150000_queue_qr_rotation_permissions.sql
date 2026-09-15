-- A clinic keeps one stable QR token. Rotating it invalidates the prior QR
-- and is restricted to a super admin, organization administrator, or that
-- clinic's manager.
create or replace function private.rotate_clinic_queue_qr_token(target_clinic_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $function$
declare
  clinic_row public.clinics;
  next_token uuid;
begin
  select * into clinic_row
  from public.clinics
  where id = target_clinic_id
  for update;

  if clinic_row.id is null then
    raise exception 'Clínica não encontrada';
  end if;

  if not exists (
    select 1
    from public.user_roles user_role
    join public.roles role on role.id = user_role.role_id
    where user_role.user_id = auth.uid()
      and user_role.organization_id = clinic_row.organization_id
      and user_role.is_active
      and role.code in ('super_admin', 'organization_admin', 'clinic_manager')
      and (
        not exists (
          select 1 from public.user_clinic_scopes scope
          where scope.user_role_id = user_role.id
        )
        or exists (
          select 1 from public.user_clinic_scopes scope
          where scope.user_role_id = user_role.id
            and scope.clinic_id = clinic_row.id
            and scope.revoked_at is null
        )
      )
  ) then
    raise exception 'Somente gestores e administradores podem gerar um novo QR Code';
  end if;

  update public.clinics
  set queue_qr_token = gen_random_uuid(), updated_at = now()
  where id = clinic_row.id
  returning queue_qr_token into next_token;

  return next_token;
end;
$function$;

create or replace function public.rotate_clinic_queue_qr_token(target_clinic_id uuid)
returns uuid
language sql
security invoker
set search_path = public, private
as $function$
  select private.rotate_clinic_queue_qr_token(target_clinic_id);
$function$;

revoke execute on function public.rotate_clinic_queue_qr_token(uuid) from public, anon;
grant execute on function public.rotate_clinic_queue_qr_token(uuid) to authenticated;
