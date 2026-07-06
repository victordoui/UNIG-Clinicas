import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCouncilProposals, useCouncilVotesForProposals, type CouncilProposal } from '@/hooks/useCouncil';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, History as HistoryIcon, Image as ImageIcon } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { IOSSegmentedFilter, type IOSFilterOption } from '@/components/conselho/ios/IOSSegmentedFilter';
import { formatBRL } from '@/lib/purchaseLabels';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type HistFilter = 'todas' | 'aprovada' | 'reprovada' | 'ajuste';

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

const BADGE: Record<'aprovada' | 'reprovada' | 'ajuste', string> = {
  aprovada: 'bg-ios-green/15 text-ios-green',
  reprovada: 'bg-ios-red/12 text-ios-red',
  ajuste: 'bg-ios-orange/15 text-ios-orange',
};
const BADGE_LABEL: Record<'aprovada' | 'reprovada' | 'ajuste', string> = {
  aprovada: 'Aprovada',
  reprovada: 'Rejeitada',
  ajuste: 'Ajuste solicitado',
};

export default function ConselhoHistorico() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filter, setFilter] = useState<HistFilter>('todas');
  const { data: all = [], isLoading } = useCouncilProposals('all');

  const decidedIds = useMemo(
    () => all.filter(p => p.status === 'aprovada' || p.status === 'reprovada').map(p => p.id),
    [all]
  );
  const { data: votes = [] } = useCouncilVotesForProposals(decidedIds);
  const { data: quotes = [] } = useQuotesForProposals(decidedIds);

  const minByProposal = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of quotes) {
      const t = Number(q.total);
      if (!Number.isFinite(t)) continue;
      if (map[q.proposal_id] === undefined || t < map[q.proposal_id]) map[q.proposal_id] = t;
    }
    return map;
  }, [quotes]);

  type Item = { proposal: CouncilProposal; kind: 'aprovada' | 'reprovada' | 'ajuste'; byMe: boolean };

  const items: Item[] = useMemo(() => {
    return all
      .filter(p => p.status === 'aprovada' || p.status === 'reprovada')
      .map(p => {
        const myVote = votes.find(v => v.proposal_id === p.id && v.membro_user_id === user?.id);
        const kind: Item['kind'] =
          myVote?.voto === 'abstencao' ? 'ajuste'
          : p.status === 'aprovada' ? 'aprovada' : 'reprovada';
        return { proposal: p, kind, byMe: !!myVote };
      });
  }, [all, votes, user]);

  const counts = useMemo(() => ({
    todas: items.length,
    aprovada: items.filter(i => i.kind === 'aprovada').length,
    reprovada: items.filter(i => i.kind === 'reprovada').length,
    ajuste: items.filter(i => i.kind === 'ajuste').length,
  }), [items]);

  const filtered = items.filter(i => filter === 'todas' || i.kind === filter);

  const options: IOSFilterOption<HistFilter>[] = [
    { value: 'todas', label: 'Todas', count: counts.todas },
    { value: 'aprovada', label: 'Aprovadas', count: counts.aprovada },
    { value: 'reprovada', label: 'Rejeitadas', count: counts.reprovada },
    { value: 'ajuste', label: 'Ajuste', count: counts.ajuste },
  ];

  return (
    <MainLayout>
      <div className="min-h-full bg-ios-bg -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 pb-24 animate-fade-in">
        <div className="max-w-2xl lg:max-w-6xl mx-auto space-y-4 pt-1">
          {/* Top bar */}
          <div className="flex items-center justify-between -mx-1">
            <button
              type="button"
              onClick={() => navigate('/conselho')}
              className="inline-flex items-center gap-1 text-ios-blue text-[15px] font-medium px-1 active:opacity-60"
            >
              <ArrowLeft className="h-5 w-5" /> Voltar
            </button>
          </div>

          <h1 className="text-[28px] font-bold tracking-tight text-ios-text leading-tight pt-1">Histórico</h1>

          <IOSSegmentedFilter options={options} value={filter} onChange={(v) => setFilter(v as HistFilter)} />

          {isLoading ? (
            <p className="text-sm text-ios-gray">Carregando…</p>
          ) : filtered.length === 0 ? (
            <EmptyState icon={HistoryIcon} title="Sem histórico" description="Nenhuma proposta neste filtro." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 pt-1">
              {filtered.map(({ proposal: p, kind, byMe }) => {
                const titulo = p.titulo.replace(/^\[DEMO\]\s*/, '');
                const valor = minByProposal[p.id];
                const valorLabel = valor !== undefined ? formatBRL(valor) : '—';
                const decided = p.decidido_em ? new Date(p.decidido_em) : new Date(p.updated_at);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => navigate(`/conselho/${p.id}`)}
                    className="text-left bg-ios-card rounded-ios shadow-ios-card p-3 flex gap-3 items-center active:scale-[0.99] transition"
                  >
                    <div className="h-14 w-14 shrink-0 rounded-[12px] overflow-hidden bg-muted/60 flex items-center justify-center">
                      {p.imagem_url ? (
                        <img src={p.imagem_url} alt={titulo} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[14px] font-semibold text-ios-text truncate">{titulo}</p>
                        <span className={cn('shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', BADGE[kind])}>
                          {BADGE_LABEL[kind]}
                        </span>
                      </div>
                      <p className="text-[15px] font-bold tabular-nums text-ios-text mt-0.5">{valorLabel}</p>
                      <p className="text-[11px] text-ios-gray mt-0.5">
                        {byMe ? `${kind === 'ajuste' ? 'Ajuste solicitado' : kind === 'aprovada' ? 'Aprovada' : 'Rejeitada'} por você` : 'Decidida pelo conselho'}
                        {' · '}
                        {format(decided, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
