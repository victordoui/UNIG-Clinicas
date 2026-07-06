import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Budget {
  id: string;
  organization_id: string;
  cost_center_id: string | null;
  category: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  valor_planejado: number;
  valor_alerta_percent: number;
  ativo: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetStatus {
  id: string;
  cost_center_id: string | null;
  cost_center_nome: string | null;
  category: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  valor_planejado: number;
  valor_consumido: number;
  pct_consumido: number;
  valor_alerta_percent: number;
}

export function useBudgets() {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['budgets', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('budgets')
        .select('*')
        .eq('organization_id', orgId)
        .order('periodo_inicio', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Budget[];
    },
  });
}

export function useBudgetStatus() {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['budget_status', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('budget_status');
      if (error) throw error;
      return (data ?? []) as BudgetStatus[];
    },
  });
}

export function useUpsertBudget() {
  const { organization, user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (b: Partial<Budget> & { id?: string }) => {
      if (!organization || !user) throw new Error('Sem organização');
      const payload: any = {
        organization_id: organization.organization_id,
        cost_center_id: b.cost_center_id || null,
        category: b.category || null,
        periodo_inicio: b.periodo_inicio,
        periodo_fim: b.periodo_fim,
        valor_planejado: b.valor_planejado,
        valor_alerta_percent: b.valor_alerta_percent ?? 80,
        ativo: b.ativo ?? true,
        created_by: user.id,
      };
      if (b.id) {
        const { error } = await (supabase as any).from('budgets').update(payload).eq('id', b.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('budgets').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['budget_status'] });
      toast({ title: 'Orçamento salvo' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any).from('budgets').delete().eq('id', id).select();
      if (error) throw error;
      if (!data?.length) throw new Error('Sem permissão');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['budget_status'] });
      toast({ title: 'Orçamento removido' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
