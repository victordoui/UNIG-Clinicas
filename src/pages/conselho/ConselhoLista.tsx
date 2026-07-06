import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  useCouncilProposals,
  useGrantCouncilTestAccess,
  useIsCouncilMember,
  useCouncilMembers,
  useCouncilVotesForProposals,
  type CouncilProposal,
  type CouncilMember,
  type CouncilStatus,
} from '@/hooks/useCouncil';
import { useAuth } from '@/hooks/useAuth';
import { Vote, Plus, KeyRound, SlidersHorizontal, LayoutGrid, List, Search, ArrowUpDown, BarChart3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useState, useMemo } from 'react';
import { IOSHeader } from '@/components/conselho/ios/IOSHeader';
import { IOSSegmentedFilter, type IOSFilterOption } from '@/components/conselho/ios/IOSSegmentedFilter';
import { IOSProposalCard } from '@/components/conselho/ios/IOSProposalCard';
import { ConselhoFiltersSheet } from '@/components/conselho/ios/ConselhoFiltersSheet';
import { derivePriorityFromAge } from '@/components/conselho/ios/iosPriority';
import { formatBRL } from '@/lib/purchaseLabels';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

type ListFilter = 'all' | 'pendentes' | 'aprovada' | 'reprovada';
type SortKey = 'recent' | 'oldest' | 'valor_desc' | 'valor_asc' | 'priority';

function useQuotesForProposals(ids: string[]) {
  const key = ids.slice().sort().join(',');
  return useQuery({
    queryKey: ['council_quotes_bulk', key],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('council_proposal_quotes' as any)
        .select('proposal_id, total')
        .in('proposal_id', ids);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ proposal_id: string; total: number }>;
    },
  });
}

export default function ConselhoLista() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ListFilter>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const { data: allData, isLoading } = useCouncilProposals('all');
  const { unigRole, isSuperAdmin, user } = useAuth();
  const isMember = useIsCouncilMember();
  const { data: members = [] } = useCouncilMembers();
  const grant = useGrantCouncilTestAccess();
  const canCreate = isSuperAdmin || unigRole === 'administrador' || unigRole === 'gerente_geral' || unigRole === 'compras';

  const all = allData ?? [];
  const ids = useMemo(() => all.map(p => p.id), [all]);
  const { data: allVotes = [] } = useCouncilVotesForProposals(ids);
  const { data: allQuotes = [] } = useQuotesForProposals(ids);

  // Mínimo total por proposta
  const minByProposal = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of allQuotes) {
      const t = Number(q.total);
      if (!Number.isFinite(t)) continue;
      if (map[q.proposal_id] === undefined || t < map[q.proposal_id]) {
        map[q.proposal_id] = t;
      }
    }
    return map;
  }, [allQuotes]);

  // Contagem real para o sino: propostas em_votacao sem voto do user atual
  const bellCount = useMemo(() => {
    if (!user) return 0;
    const inVoting = all.filter(p => p.status === 'em_votacao').map(p => p.id);
    const votedSet = new Set(allVotes.filter(v => v.membro_user_id === user.id).map(v => v.proposal_id));
    return inVoting.filter(id => !votedSet.has(id)).length;
  }, [all, allVotes, user]);

  // Counts por filtro
  const counts = useMemo(() => {
    const byStatus: Record<CouncilStatus, number> = {
      rascunho: 0, em_votacao: 0, aprovada: 0, reprovada: 0, retirada: 0,
    };
    for (const p of all) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    return {
      all: all.length,
      pendentes: byStatus.em_votacao + byStatus.rascunho,
      aprovada: byStatus.aprovada,
      reprovada: byStatus.reprovada,
    };
  }, [all]);

  // Votos por proposta (count) e set de pendentes p/ user atual
  const votesCountByProposal = useMemo(() => {
    const m: Record<string, number> = {};
    for (const v of allVotes) m[v.proposal_id] = (m[v.proposal_id] ?? 0) + 1;
    return m;
  }, [allVotes]);

  const myVotedSet = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(allVotes.filter(v => v.membro_user_id === user.id).map(v => v.proposal_id));
  }, [allVotes, user]);

  const memberByUser = useMemo(() => {
    const m: Record<string, CouncilMember> = {};
    for (const x of members) m[x.user_id] = x;
    return m;
  }, [members]);

  const priorityOrder: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const arr = all.filter(p => {
      if (filter === 'pendentes' && !(p.status === 'em_votacao' || p.status === 'rascunho')) return false;
      if (filter !== 'all' && filter !== 'pendentes' && p.status !== filter) return false;
      if (!term) return true;
      const memberInfo = memberByUser[p.created_by];
      const haystack = [
        p.titulo,
        p.location ?? '',
        memberInfo?.nome_exibicao ?? '',
      ].join(' ').toLowerCase();
      return haystack.includes(term);
    });
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'valor_desc': return (minByProposal[b.id] ?? -1) - (minByProposal[a.id] ?? -1);
        case 'valor_asc': return (minByProposal[a.id] ?? Number.POSITIVE_INFINITY) - (minByProposal[b.id] ?? Number.POSITIVE_INFINITY);
        case 'priority': return priorityOrder[derivePriorityFromAge(a.created_at)] - priorityOrder[derivePriorityFromAge(b.created_at)];
        case 'recent':
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return arr;
  }, [all, filter, search, sortKey, minByProposal, memberByUser]);

  const filterOptions: IOSFilterOption<ListFilter>[] = [
    { value: 'all', label: 'Todas', count: counts.all },
    { value: 'pendentes', label: 'Pendentes', count: counts.pendentes },
    { value: 'aprovada', label: 'Aprovadas', count: counts.aprovada },
    { value: 'reprovada', label: 'Rejeitadas', count: counts.reprovada },
  ];

  function renderCard(p: CouncilProposal) {
    const titulo = p.titulo.replace(/^\[DEMO\]\s*/, '');
    const memberInfo = memberByUser[p.created_by];
    const solicitante = memberInfo?.nome_exibicao?.trim() || 'Solicitante';
    const tempo = formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ptBR });
    const priority = derivePriorityFromAge(p.created_at);
    const valor = minByProposal[p.id];
    const valorLabel = valor !== undefined ? formatBRL(valor) : 'Sem cotação';
    const area = p.location?.trim() || 'Geral';
    const pendingForMe = isMember && p.status === 'em_votacao' && !myVotedSet.has(user?.id ?? '');
    const votesCount = votesCountByProposal[p.id] ?? 0;
    return (
      <IOSProposalCard
        key={p.id}
        imageUrl={p.imagem_url}
        title={titulo}
        valueLabel={valorLabel}
        area={area}
        solicitante={solicitante}
        solicitanteFoto={memberInfo?.foto_url}
        tempo={tempo}
        priority={priority}
        dense={viewMode === 'list'}
        pendingForMe={pendingForMe}
        votesCount={p.status === 'em_votacao' ? votesCount : undefined}
        votesTotal={p.status === 'em_votacao' ? p.total_membros : undefined}
        onClick={() => navigate(`/conselho/${p.id}`)}
      />
    );
  }

  return (
    <MainLayout>
      <div className="min-h-full bg-ios-bg -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 pb-24 animate-fade-in">
        <div className="max-w-2xl lg:max-w-6xl mx-auto space-y-4 pt-1">
          <IOSHeader
            title="Aprovações"
            rightSlot={
              <>
                <Link
                  to="/conselho/dashboard"
                  aria-label="Dashboard do conselho"
                  className="h-10 w-10 rounded-full bg-ios-card border border-border/40 shadow-sm flex items-center justify-center active:scale-95 transition"
                >
                  <BarChart3 className="h-[18px] w-[18px] text-ios-text" />
                </Link>
                <ConselhoFiltersSheet
                  options={filterOptions}
                  value={filter}
                  onChange={(v) => setFilter(v)}
                >
                  <button
                    aria-label="Filtros"
                    className="h-10 w-10 rounded-full bg-ios-card border border-border/40 shadow-sm flex items-center justify-center active:scale-95 transition"
                  >
                    <SlidersHorizontal className="h-[18px] w-[18px] text-ios-text" />
                  </button>
                </ConselhoFiltersSheet>
                <button
                  type="button"
                  aria-label="Alternar visualização"
                  onClick={() => setViewMode((m) => (m === 'card' ? 'list' : 'card'))}
                  className="h-10 w-10 rounded-full bg-ios-card border border-border/40 shadow-sm flex items-center justify-center active:scale-95 transition"
                >
                  {viewMode === 'card' ? (
                    <List className="h-[18px] w-[18px] text-ios-text" />
                  ) : (
                    <LayoutGrid className="h-[18px] w-[18px] text-ios-text" />
                  )}
                </button>
              </>
            }
          />

          {/* Search + Sort */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ios-gray" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título, área ou solicitante…"
                className="h-10 pl-9 rounded-full bg-ios-card border-border/40"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Ordenar"
                  className="h-10 w-10 rounded-full bg-ios-card border border-border/40 shadow-sm flex items-center justify-center active:scale-95 transition shrink-0"
                >
                  <ArrowUpDown className="h-[16px] w-[16px] text-ios-text" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                  <DropdownMenuRadioItem value="recent">Mais recentes</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="oldest">Mais antigas</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="valor_desc">Maior valor</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="valor_asc">Menor valor</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="priority">Prioridade</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {!isMember && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => grant.mutate()}
              disabled={grant.isPending}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Acesso de teste (conselheiro)
            </Button>
          )}

          <IOSSegmentedFilter options={filterOptions} value={filter} onChange={(v) => setFilter(v as ListFilter)} />

          {isLoading ? (
            <p className="text-sm text-ios-gray">Carregando…</p>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Vote} title="Nenhuma proposta" description="Ainda não há propostas neste filtro." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pt-1">
              {filtered.map(renderCard)}
            </div>
          )}
        </div>
      </div>

      {canCreate && (
        <Link
          to="/conselho/nova"
          aria-label="Nova proposta"
          className="fixed right-4 bottom-20 z-40 h-14 w-14 rounded-full bg-ios-blue text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </Link>
      )}
    </MainLayout>
  );
}
