import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface KpiRange {
  from: string; // ISO
  to: string;   // ISO
}

export interface OverviewKpi {
  solicitacoes_total: number;
  solicitacoes_abertas: number;
  aprovadas: number;
  pedidos_emitidos: number;
  pedidos_recebidos: number;
  valor_comprado: number;
  ticket_medio: number;
  lead_time_medio_dias: number;
  pct_no_prazo: number;
}

export function usePurchaseKpis(range: KpiRange) {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;

  const overview = useQuery({
    queryKey: ['kpi_overview', orgId, range],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('kpi_purchases_overview', { _from: range.from, _to: range.to });
      if (error) throw error;
      return (data ?? {}) as OverviewKpi;
    },
  });

  const byStatus = useQuery({
    queryKey: ['kpi_by_status', orgId, range],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('kpi_purchases_by_status', { _from: range.from, _to: range.to });
      if (error) throw error;
      return (data ?? []) as Array<{ status: string; total: number }>;
    },
  });

  const byCategory = useQuery({
    queryKey: ['kpi_by_category', orgId, range],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('kpi_purchases_by_category', { _from: range.from, _to: range.to });
      if (error) throw error;
      return (data ?? []) as Array<{ categoria: string; total_pedidos: number; valor_total: number }>;
    },
  });

  const topSuppliers = useQuery({
    queryKey: ['kpi_top_suppliers', orgId, range],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('kpi_top_suppliers', { _from: range.from, _to: range.to, _limit: 10 });
      if (error) throw error;
      return (data ?? []) as Array<{
        supplier_id: string; nome_fantasia: string;
        total_pedidos: number; valor_total: number;
        nota_media: number; pct_no_prazo: number;
      }>;
    },
  });

  const series = useQuery({
    queryKey: ['kpi_series', orgId, range],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('kpi_purchase_lead_time_series', { _from: range.from, _to: range.to });
      if (error) throw error;
      return (data ?? []) as Array<{ mes: string; emitidos: number; recebidos: number }>;
    },
  });

  return { overview, byStatus, byCategory, topSuppliers, series };
}
