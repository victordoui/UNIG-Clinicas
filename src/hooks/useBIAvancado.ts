import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface StockoutAlert {
  product_id: string; product_name: string;
  current_stock: number; consumo_diario: number; cobertura_dias: number;
  lead_time_dias: number; status: 'critico' | 'alerta' | 'ok' | 'sem_consumo';
}

export interface SavedView {
  id: string; nome: string; descricao: string | null;
  filtros: any; grafico: string; visibilidade: 'privada' | 'compartilhada';
  user_id: string; created_at: string;
}

export function useStockoutAlerts(leadTime = 7) {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ['stockout_alerts', organization?.organization_id, leadTime],
    enabled: !!organization?.organization_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_stockout_alerts', { p_lead_time_default: leadTime });
      if (error) throw error;
      return (data ?? []) as StockoutAlert[];
    },
  });
}

export function useSavedViews() {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['bi_saved_views', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('bi_saved_views').select('*').eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedView[];
    },
  });
}

export function usePurchaseSimulations() {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['purchase_simulations', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('purchase_simulations').select('*, products(name)')
        .eq('organization_id', orgId).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBIActions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { organization, user } = useAuth();
  const orgId = organization?.organization_id;

  const saveView = useMutation({
    mutationFn: async (input: Partial<SavedView>) => {
      if (!orgId || !user) throw new Error('Sem organização');
      const { error } = await (supabase as any).from('bi_saved_views').insert({
        ...input, organization_id: orgId, user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Visão salva' });
      qc.invalidateQueries({ queryKey: ['bi_saved_views'] });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const runSimulation = useMutation({
    mutationFn: async (input: { nome: string; descricao?: string; product_id?: string; supplier_id?: string; quantidade: number; preco_unitario: number; lead_time_dias: number }) => {
      if (!orgId || !user) throw new Error('Sem organização');
      // Cálculo determinístico
      let consumoDiario = 0; let estoqueAtual = 0; let validadeMedia = 0;
      if (input.product_id) {
        const { data: p } = await (supabase as any)
          .from('products').select('current_stock').eq('id', input.product_id).maybeSingle();
        estoqueAtual = Number(p?.current_stock ?? 0);
        const desde = new Date(); desde.setDate(desde.getDate() - 90);
        const { data: ms } = await (supabase as any).from('movements')
          .select('quantity').eq('product_id', input.product_id).eq('type', 'saida')
          .gte('created_at', desde.toISOString());
        const consumo90 = (ms ?? []).reduce((s: number, m: any) => s + Number(m.quantity || 0), 0);
        consumoDiario = consumo90 / 90;
      }
      const custoTotal = input.quantidade * input.preco_unitario;
      const novoEstoque = estoqueAtual + input.quantidade;
      const cobertura = consumoDiario > 0 ? Math.round((novoEstoque / consumoDiario) * 10) / 10 : null;
      const previsao = new Date(); previsao.setDate(previsao.getDate() + input.lead_time_dias);
      const resultado = {
        custo_total: custoTotal, estoque_atual: estoqueAtual, novo_estoque: novoEstoque,
        consumo_diario: Math.round(consumoDiario * 100) / 100,
        cobertura_dias: cobertura, validade_media_dias: validadeMedia,
        previsao_entrega: previsao.toISOString().slice(0, 10),
      };
      const { error } = await (supabase as any).from('purchase_simulations').insert({
        ...input, organization_id: orgId, user_id: user.id, resultado,
      });
      if (error) throw error;
      return resultado;
    },
    onSuccess: () => {
      toast({ title: 'Simulação executada' });
      qc.invalidateQueries({ queryKey: ['purchase_simulations'] });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { saveView, runSimulation };
}
