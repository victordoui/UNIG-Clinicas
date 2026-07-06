import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface DemandForecast {
  id: string;
  product_id: string;
  organization_id: string;
  periodo: string;
  consumo_previsto: number;
  consumo_real: number | null;
  confianca: number;
  metodo: string;
  gerado_em: string;
  product?: { name: string; sku: string; category: string; current_stock: number };
}

export function useDemandForecasts(productId?: string) {
  return useQuery({
    queryKey: ['demand_forecasts', productId],
    queryFn: async () => {
      let q = (supabase as any)
        .from('demand_forecasts')
        .select('*, product:products(name, sku, category, current_stock)')
        .order('periodo', { ascending: false });
      if (productId) q = q.eq('product_id', productId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DemandForecast[];
    },
  });
}

export function useRecalculateForecast() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async (productIds: string[]) => {
      const orgId = organization?.organization_id;
      if (!orgId) throw new Error('Sem organização');
      let total = 0;
      for (const pid of productIds) {
        const { error } = await (supabase as any).rpc('calculate_demand_forecast', {
          _org: orgId,
          _product_id: pid,
        });
        if (!error) total++;
      }
      return total;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['demand_forecasts'] });
      toast({ title: `${n} previsão(ões) recalculada(s)` });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
