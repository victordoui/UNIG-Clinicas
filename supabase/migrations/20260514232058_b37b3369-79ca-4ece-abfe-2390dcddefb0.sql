
-- Storage bucket for council proposal images
insert into storage.buckets (id, name, public)
values ('council-proposals', 'council-proposals', true)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "council_imgs_public_read" on storage.objects;
create policy "council_imgs_public_read" on storage.objects
  for select to public
  using (bucket_id = 'council-proposals');

drop policy if exists "council_imgs_auth_insert" on storage.objects;
create policy "council_imgs_auth_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'council-proposals');

drop policy if exists "council_imgs_auth_update" on storage.objects;
create policy "council_imgs_auth_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'council-proposals');

drop policy if exists "council_imgs_auth_delete" on storage.objects;
create policy "council_imgs_auth_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'council-proposals');

-- Test access RPC: current user becomes council member of their org
create or replace function public.council_grant_test_access()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_org uuid;
begin
  v_org := public.get_user_organization_id();
  if v_org is null then
    raise exception 'Usuário sem organização';
  end if;
  insert into public.council_members (organization_id, user_id, ativo, created_by)
  values (v_org, auth.uid(), true, auth.uid())
  on conflict (organization_id, user_id) do update set ativo = true;
end $$;

-- ============ SEED de propostas fake ============
do $$
declare
  v_org uuid;
  v_user uuid;
  v_p1 uuid; v_p2 uuid; v_p3 uuid; v_p4 uuid;
begin
  -- Pega a primeira organização ativa
  select id into v_org from public.organizations order by created_at limit 1;
  if v_org is null then return; end if;

  -- Pega um admin/super_admin dessa org (created_by é obrigatório)
  select user_id into v_user
  from public.organization_members
  where organization_id = v_org
  order by created_at
  limit 1;
  if v_user is null then return; end if;

  -- Evita seed duplicado
  if exists (select 1 from public.council_proposals
             where organization_id = v_org and titulo like '[DEMO]%') then
    return;
  end if;

  -- Proposta 1: cadeiras diretor (em votação)
  insert into public.council_proposals (organization_id, titulo, justificativa, imagem_url, location, status, created_by)
  values (v_org,
    '[DEMO] Cadeiras Diretor — Jurídico Nova Iguaçu',
    'Substituição das 4 cadeiras do setor jurídico, com mais de 8 anos de uso e apresentando defeitos estruturais. Modelo ergonômico para uso prolongado.',
    'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=1200&q=80',
    'Jurídico — Nova Iguaçu', 'em_votacao', v_user)
  returning id into v_p1;

  insert into public.council_proposal_quotes (proposal_id, posicao, fornecedor, valor_unit, qtd, frete, condicoes) values
    (v_p1, 1, 'MoveisCorp Brasil', 1450.00, 4, 180.00, 'À vista'),
    (v_p1, 2, 'Office Premium', 1620.00, 4, 0.00,    '3x sem juros'),
    (v_p1, 3, 'Ergonomia Total', 1380.00, 4, 250.00, '6x com juros');

  -- Proposta 2: notebooks (aprovada)
  insert into public.council_proposals (organization_id, titulo, justificativa, imagem_url, location, status, created_by, decidido_em)
  values (v_org,
    '[DEMO] Notebooks Dell para equipe de TI',
    'Aquisição de 3 notebooks Dell Latitude para reposição da equipe de infraestrutura.',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&q=80',
    'TI — Sede', 'aprovada', v_user, now() - interval '2 days')
  returning id into v_p2;

  insert into public.council_proposal_quotes (proposal_id, posicao, fornecedor, valor_unit, qtd, frete, condicoes) values
    (v_p2, 1, 'Dell Direct', 6890.00, 3, 0.00, '10x sem juros'),
    (v_p2, 2, 'TecnoStore',  7150.00, 3, 120.00, 'À vista (5% desc.)'),
    (v_p2, 3, 'Kabum Empresas', 7050.00, 3, 0.00, '6x sem juros');

  -- Proposta 3: reforma (rascunho)
  insert into public.council_proposals (organization_id, titulo, justificativa, imagem_url, location, status, created_by)
  values (v_org,
    '[DEMO] Reforma Sala de Reuniões Executiva',
    'Reforma completa da sala de reuniões do 3º andar: pintura, acústica, mobiliário e iluminação.',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
    'Sede — 3º andar', 'rascunho', v_user)
  returning id into v_p3;

  insert into public.council_proposal_quotes (proposal_id, posicao, fornecedor, valor_unit, qtd, frete, condicoes) values
    (v_p3, 1, 'Construtora ABC', 28500.00, 1, 0.00, '3x sem juros'),
    (v_p3, 2, 'Reformas Express', 31200.00, 1, 0.00, 'À vista (8% desc.)'),
    (v_p3, 3, 'Studio Arquitetura', 26800.00, 1, 0.00, '12x com juros'),
    (v_p3, 4, 'OBS Engenharia',   29900.00, 1, 0.00, '6x sem juros');

  -- Proposta 4: servidor (em votação)
  insert into public.council_proposals (organization_id, titulo, justificativa, imagem_url, location, status, created_by)
  values (v_org,
    '[DEMO] Servidor Dell PowerEdge para Datacenter',
    'Servidor para virtualização e ambiente de produção. Necessário para suportar crescimento dos sistemas internos.',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80',
    'Datacenter — Sede', 'em_votacao', v_user)
  returning id into v_p4;

  insert into public.council_proposal_quotes (proposal_id, posicao, fornecedor, valor_unit, qtd, frete, condicoes) values
    (v_p4, 1, 'Dell Enterprise',  42500.00, 1, 0.00,   '10x sem juros'),
    (v_p4, 2, 'HPE Brasil',       45800.00, 1, 350.00, 'À vista'),
    (v_p4, 3, 'Server Solutions', 41200.00, 1, 600.00, '6x com juros');
end $$;
