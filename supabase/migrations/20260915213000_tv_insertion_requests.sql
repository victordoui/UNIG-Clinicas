create table public.tv_insertion_requests (
  clinic_id uuid primary key references public.clinics(id),
  request_id uuid not null default gen_random_uuid(),
  campaign_id uuid not null references public.tv_campaigns(id) on delete cascade,
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  requested_by uuid not null references auth.users(id)
);
alter table public.tv_insertion_requests enable row level security;
create policy tv_insertion_read on public.tv_insertion_requests for select to authenticated using (
  exists (select 1 from public.user_roles ur join public.clinics c on c.organization_id = ur.organization_id
    where c.id = clinic_id and ur.user_id = auth.uid() and ur.is_active)
);
grant select on public.tv_insertion_requests to authenticated;

create function private.request_tv_insertion(target_clinic_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare campaign public.tv_campaigns; new_request uuid := gen_random_uuid();
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
      join public.clinics c on c.organization_id = ur.organization_id
    where c.id = target_clinic_id and ur.user_id = auth.uid() and ur.is_active
      and (r.code in ('super_admin','organization_admin') or (
        r.code in ('clinic_manager','receptionist') and exists (
          select 1 from public.user_clinic_scopes s where s.user_role_id = ur.id
            and s.clinic_id = target_clinic_id and s.revoked_at is null)))
  ) then raise exception 'Sem permissão para chamar inserção nesta clínica' using errcode = '42501'; end if;
  select t.* into campaign from public.tv_campaigns t join public.clinics c on c.organization_id = t.organization_id
    where c.id = target_clinic_id and t.status = 'published'
      and (t.starts_at is null or t.starts_at <= now()) and (t.ends_at is null or t.ends_at > now())
    order by t.priority desc, t.created_at desc limit 1;
  if not found then raise exception 'Publique uma campanha válida antes de chamar uma inserção'; end if;
  insert into public.tv_insertion_requests (clinic_id,request_id,campaign_id,requested_at,expires_at,requested_by)
    values (target_clinic_id,new_request,campaign.id,now(),now() + (campaign.display_seconds + 5) * interval '1 second',auth.uid())
    on conflict (clinic_id) do update set request_id = excluded.request_id, campaign_id = excluded.campaign_id,
      requested_at = excluded.requested_at, expires_at = excluded.expires_at, requested_by = excluded.requested_by;
  return new_request;
end; $$;
revoke all on function private.request_tv_insertion(uuid) from public, anon;
grant execute on function private.request_tv_insertion(uuid) to authenticated;
create function public.request_tv_insertion(target_clinic_id uuid) returns uuid
language sql security invoker set search_path = '' as $$ select private.request_tv_insertion(target_clinic_id); $$;
revoke all on function public.request_tv_insertion(uuid) from public, anon;
grant execute on function public.request_tv_insertion(uuid) to authenticated;
notify pgrst, 'reload schema';
