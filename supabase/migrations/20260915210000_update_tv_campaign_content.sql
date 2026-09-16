-- Edição limitada ao conteúdo. Preserva organização, autoria, publicação e exclusão.
create or replace function private.update_tv_campaign_content(target_campaign_id uuid, content jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign public.tv_campaigns;
begin
  if auth.uid() is null then
    raise exception 'Sessão obrigatória' using errcode = '42501';
  end if;
  select * into campaign from public.tv_campaigns where id = target_campaign_id for update;
  if not found or not exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and ur.organization_id = campaign.organization_id
      and ur.is_active and r.code in ('super_admin', 'organization_admin', 'clinic_manager')
  ) then
    raise exception 'Sem permissão para editar esta campanha' using errcode = '42501';
  end if;
  if content is null or jsonb_typeof(content) <> 'object' then
    raise exception 'Conteúdo inválido';
  end if;
  -- As constraints da tabela também validam tamanho, duração e formatos.
  update public.tv_campaigns set
    title = btrim(content ->> 'title'),
    message = btrim(content ->> 'message'),
    media_url = nullif(content ->> 'media_url', ''),
    media_type = content ->> 'media_type',
    display_seconds = (content ->> 'display_seconds')::smallint,
    display_mode = content ->> 'display_mode',
    media_fit = content ->> 'media_fit',
    updated_by = auth.uid(), updated_at = now()
  where id = target_campaign_id;
  return target_campaign_id;
end;
$$;
revoke all on function private.update_tv_campaign_content(uuid, jsonb) from public, anon;
grant execute on function private.update_tv_campaign_content(uuid, jsonb) to authenticated;

create or replace function public.update_tv_campaign_content(target_campaign_id uuid, content jsonb)
returns uuid language sql security invoker set search_path = ''
as $$ select private.update_tv_campaign_content(target_campaign_id, content); $$;
revoke all on function public.update_tv_campaign_content(uuid, jsonb) from public, anon;
grant execute on function public.update_tv_campaign_content(uuid, jsonb) to authenticated;
notify pgrst, 'reload schema';
