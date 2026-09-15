-- Permite somente alternar a publicação de uma campanha por gestores da própria organização.
-- Edição e exclusão continuam cobertas pelas políticas RLS já existentes.
create or replace function private.set_tv_campaign_publication(
  target_campaign_id uuid,
  target_status text
)
returns public.tv_campaigns
language plpgsql
security definer
set search_path = public, private
as $$
declare
  campaign public.tv_campaigns;
begin
  if auth.uid() is null then
    raise exception 'Sessão obrigatória';
  end if;

  if target_status not in ('draft', 'published') then
    raise exception 'Status de publicação inválido';
  end if;

  select * into campaign
  from public.tv_campaigns
  where id = target_campaign_id
  for update;

  if campaign.id is null then
    raise exception 'Campanha não encontrada';
  end if;

  if not exists (
    select 1
    from public.user_roles user_role
    join public.roles role on role.id = user_role.role_id
    where user_role.user_id = auth.uid()
      and user_role.organization_id = campaign.organization_id
      and user_role.is_active = true
      and role.code in ('super_admin', 'organization_admin', 'clinic_manager')
  ) then
    raise exception 'Sem permissão para publicar esta campanha';
  end if;

  update public.tv_campaigns
  set status = target_status,
      updated_by = auth.uid(),
      updated_at = now()
  where id = campaign.id
  returning * into campaign;

  return campaign;
end;
$$;

revoke execute on function private.set_tv_campaign_publication(uuid, text) from public, anon, authenticated;
grant execute on function private.set_tv_campaign_publication(uuid, text) to authenticated;

create or replace function public.set_tv_campaign_publication(
  target_campaign_id uuid,
  target_status text
)
returns public.tv_campaigns
language sql
security invoker
set search_path = public, private
as $$
  select private.set_tv_campaign_publication(target_campaign_id, target_status);
$$;

revoke execute on function public.set_tv_campaign_publication(uuid, text) from public, anon;
grant execute on function public.set_tv_campaign_publication(uuid, text) to authenticated;
