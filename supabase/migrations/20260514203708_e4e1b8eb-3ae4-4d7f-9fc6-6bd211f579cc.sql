
-- ============ ENUM ============
do $$ begin
  create type public.council_proposal_status as enum ('rascunho','em_votacao','aprovada','reprovada','retirada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.council_vote_value as enum ('aprovado','rejeitado','abstencao');
exception when duplicate_object then null; end $$;

-- ============ TABLES ============
create table if not exists public.council_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  user_id uuid not null,
  ativo boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.council_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  ci_id uuid,
  purchase_request_id uuid,
  titulo text not null,
  justificativa text,
  imagem_url text,
  location text,
  status public.council_proposal_status not null default 'rascunho',
  min_votos_aprovacao int not null default 3,
  total_membros int not null default 5,
  created_by uuid not null,
  decidido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.council_proposal_quotes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.council_proposals(id) on delete cascade,
  posicao int not null default 1,
  fornecedor text not null,
  valor_unit numeric not null default 0,
  qtd numeric not null default 1,
  frete numeric not null default 0,
  total numeric generated always as ((valor_unit * qtd) + frete) stored,
  condicoes text,
  created_at timestamptz not null default now()
);

create table if not exists public.council_votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.council_proposals(id) on delete cascade,
  membro_user_id uuid not null,
  voto public.council_vote_value not null,
  comentario text,
  votado_em timestamptz not null default now(),
  unique (proposal_id, membro_user_id)
);

create index if not exists idx_council_proposals_org on public.council_proposals(organization_id);
create index if not exists idx_council_proposals_status on public.council_proposals(status);
create index if not exists idx_council_quotes_prop on public.council_proposal_quotes(proposal_id);
create index if not exists idx_council_votes_prop on public.council_votes(proposal_id);

-- ============ updated_at trigger ============
drop trigger if exists trg_council_proposals_updated_at on public.council_proposals;
create trigger trg_council_proposals_updated_at
before update on public.council_proposals
for each row execute function public.update_updated_at_column();

-- ============ Helper functions ============
create or replace function public.is_council_member(_user_id uuid, _org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.council_members
    where user_id = _user_id and organization_id = _org and ativo = true
  );
$$;

-- Atualiza status da proposta com base nos votos
create or replace function public.council_recalc_status(_proposal_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_p public.council_proposals%rowtype;
  v_aprov int;
  v_rej int;
  v_max_rej int;
begin
  select * into v_p from public.council_proposals where id = _proposal_id;
  if not found then return; end if;
  if v_p.status not in ('em_votacao') then return; end if;

  select count(*) filter (where voto = 'aprovado'),
         count(*) filter (where voto = 'rejeitado')
  into v_aprov, v_rej
  from public.council_votes where proposal_id = _proposal_id;

  v_max_rej := v_p.total_membros - v_p.min_votos_aprovacao;

  if v_aprov >= v_p.min_votos_aprovacao then
    update public.council_proposals
      set status = 'aprovada', decidido_em = now()
      where id = _proposal_id;
  elsif v_rej > v_max_rej then
    update public.council_proposals
      set status = 'reprovada', decidido_em = now()
      where id = _proposal_id;
  end if;
end $$;

-- RPC para registrar voto
create or replace function public.council_cast_vote(
  _proposal_id uuid, _voto public.council_vote_value, _comentario text default null
) returns void
language plpgsql security definer
set search_path = public
as $$
declare v_org uuid; begin
  select organization_id into v_org from public.council_proposals where id = _proposal_id;
  if v_org is null then raise exception 'Proposta não encontrada'; end if;
  if not public.is_council_member(auth.uid(), v_org) then
    raise exception 'Apenas membros do conselho podem votar';
  end if;
  insert into public.council_votes (proposal_id, membro_user_id, voto, comentario)
    values (_proposal_id, auth.uid(), _voto, _comentario)
    on conflict (proposal_id, membro_user_id)
    do update set voto = excluded.voto, comentario = excluded.comentario, votado_em = now();
  perform public.council_recalc_status(_proposal_id);
end $$;

-- RPC enviar para votação
create or replace function public.council_open_voting(_proposal_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare v_qtd int; begin
  select count(*) into v_qtd from public.council_proposal_quotes where proposal_id = _proposal_id;
  if v_qtd < 3 then raise exception 'Adicione no mínimo 3 cotações antes de abrir a votação'; end if;
  update public.council_proposals set status = 'em_votacao' where id = _proposal_id and status = 'rascunho';
end $$;

-- ============ RLS ============
alter table public.council_members enable row level security;
alter table public.council_proposals enable row level security;
alter table public.council_proposal_quotes enable row level security;
alter table public.council_votes enable row level security;

-- council_members
drop policy if exists "members_select_org" on public.council_members;
create policy "members_select_org" on public.council_members
  for select to authenticated
  using (organization_id = public.get_user_organization_id() or public.is_super_admin());

drop policy if exists "members_admin_manage" on public.council_members;
create policy "members_admin_manage" on public.council_members
  for all to authenticated
  using (public.is_admin() or public.is_super_admin())
  with check (public.is_admin() or public.is_super_admin());

-- council_proposals
drop policy if exists "proposals_select_org" on public.council_proposals;
create policy "proposals_select_org" on public.council_proposals
  for select to authenticated
  using (organization_id = public.get_user_organization_id() or public.is_super_admin());

drop policy if exists "proposals_insert_org" on public.council_proposals;
create policy "proposals_insert_org" on public.council_proposals
  for insert to authenticated
  with check (organization_id = public.get_user_organization_id() and created_by = auth.uid());

drop policy if exists "proposals_update_owner_or_admin" on public.council_proposals;
create policy "proposals_update_owner_or_admin" on public.council_proposals
  for update to authenticated
  using (organization_id = public.get_user_organization_id()
         and (created_by = auth.uid() or public.is_admin() or public.is_super_admin()));

drop policy if exists "proposals_delete_admin" on public.council_proposals;
create policy "proposals_delete_admin" on public.council_proposals
  for delete to authenticated
  using (organization_id = public.get_user_organization_id()
         and (public.is_admin() or public.is_super_admin())
         and status = 'rascunho');

-- council_proposal_quotes
drop policy if exists "quotes_select_org" on public.council_proposal_quotes;
create policy "quotes_select_org" on public.council_proposal_quotes
  for select to authenticated
  using (exists (select 1 from public.council_proposals p
                  where p.id = proposal_id
                    and (p.organization_id = public.get_user_organization_id() or public.is_super_admin())));

drop policy if exists "quotes_modify_owner_or_admin" on public.council_proposal_quotes;
create policy "quotes_modify_owner_or_admin" on public.council_proposal_quotes
  for all to authenticated
  using (exists (select 1 from public.council_proposals p
                  where p.id = proposal_id
                    and p.organization_id = public.get_user_organization_id()
                    and (p.created_by = auth.uid() or public.is_admin() or public.is_super_admin())))
  with check (exists (select 1 from public.council_proposals p
                       where p.id = proposal_id
                         and p.organization_id = public.get_user_organization_id()
                         and (p.created_by = auth.uid() or public.is_admin() or public.is_super_admin())));

-- council_votes
drop policy if exists "votes_select_org" on public.council_votes;
create policy "votes_select_org" on public.council_votes
  for select to authenticated
  using (exists (select 1 from public.council_proposals p
                  where p.id = proposal_id
                    and (p.organization_id = public.get_user_organization_id() or public.is_super_admin())));

-- inserts/updates de voto somente via RPC council_cast_vote (security definer)
drop policy if exists "votes_no_direct_write" on public.council_votes;
create policy "votes_no_direct_write" on public.council_votes
  for insert to authenticated
  with check (false);
