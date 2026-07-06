create or replace function public.is_org_member(_org_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where user_id = auth.uid()
      and organization_id = _org_id
      and is_active = true
  )
$$;

drop policy if exists "Members can view org peers" on public.organization_members;

create policy "Members can view org peers"
on public.organization_members
for select to authenticated
using (public.is_org_member(organization_id));