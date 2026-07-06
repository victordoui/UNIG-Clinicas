create policy "Members can view org peers"
on public.organization_members
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members me
    where me.user_id = auth.uid()
      and me.organization_id = organization_members.organization_id
      and me.is_active = true
  )
);