import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ScorecardTier = 'ouro' | 'prata' | 'bronze' | 'atencao' | 'sem_dados';

export interface SupplierScorecardRow {
  supplier_id: string;
  nome_fantasia: string;
  orders_count: number;
  total_value: number;
  manual_avg: number;
  on_time_rate: number;
  nf_on_time_rate: number;
  divergence_rate: number;
  quote_response_rate: number;
  score_final: number;
  tier: ScorecardTier;
}

export type ScorecardRangeDays = 30 | 90 | 180 | 365;

export function rangeFromDays(days: ScorecardRangeDays): { from: string; to: string } {
  const to = new Date();
  const from = new Date(Date.now() - days * 24 * 3_600_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function useSupplierRanking(days: ScorecardRangeDays = 90) {
  const range = rangeFromDays(days);
  return useQuery({
    queryKey: ['supplier_scorecard', days],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_supplier_scorecard', {
        _from: range.from,
        _to: range.to,
      });
      if (error) throw error;
      return (data ?? []) as SupplierScorecardRow[];
    },
  });
}

export function useSupplierScorecard(supplierId?: string, days: ScorecardRangeDays = 90) {
  const ranking = useSupplierRanking(days);
  return {
    ...ranking,
    data: ranking.data?.find((r) => r.supplier_id === supplierId),
  };
}

export const TIER_LABEL: Record<ScorecardTier, string> = {
  ouro: 'Ouro',
  prata: 'Prata',
  bronze: 'Bronze',
  atencao: 'Atenção',
  sem_dados: 'Sem dados',
};

export const TIER_CLASS: Record<ScorecardTier, string> = {
  ouro: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  prata: 'bg-slate-400/15 text-slate-700 border-slate-400/30',
  bronze: 'bg-orange-600/15 text-orange-700 border-orange-600/30',
  atencao: 'bg-destructive/15 text-destructive border-destructive/30',
  sem_dados: 'bg-muted text-muted-foreground border-border',
};
