import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface CycleCountTask {
  id: string;
  organization_id: string;
  plan_id: string | null;
  product_id: string;
  curva: 'A' | 'B' | 'C' | null;
  qtd_esperada: number;
  qtd_contada: number | null;
  divergencia: number | null;
  status: 'pendente' | 'contada' | 'aprovada' | 'divergente' | 'cancelada';
  ajuste_automatico: boolean;
  observacao: string | null;
  contado_por: string | null;
  contado_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface CycleCountPlan {
  id: string;
  nome: string;
  freq_a_dias: number;
  freq_b_dias: number;
  freq_c_dias: number;
  tolerancia_percent: number;
  ativo: boolean;
}

export function useCycleCountDashboard() {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ['cycle_count_dashboard', organization?.organization_id],
    enabled: !!organization?.organization_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_cycle_count_dashboard');
      if (error) throw error;
      return (data?.[0] ?? { pendentes: 0, contadas_hoje: 0, divergentes: 0, aprovadas_mes: 0, curva_a: 0, curva_b: 0, curva_c: 0 });
    },
  });
}

export function useCycleCountPlans() {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['cycle_count_plans', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cycle_count_plans').select('*')
        .eq('organization_id', orgId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CycleCountPlan[];
    },
  });
}

export function useCycleCountTasks(status?: string) {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['cycle_count_tasks', orgId, status],
    enabled: !!orgId,
    queryFn: async () => {
      let q = (supabase as any)
        .from('cycle_count_tasks')
        .select('*, products(name, sku, current_stock)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false }).limit(500);
      if (status && status !== 'todos') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCycleCountActions() {
  const qc = useQueryClient();
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const orgId = organization?.organization_id;

  const recalcABC = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc('recalc_abc_curve');
      if (error) throw error;
      return data;
    },
    onSuccess: (n) => {
      toast({ title: 'Curva ABC recalculada', description: `${n} produtos classificados.` });
      qc.invalidateQueries({ queryKey: ['cycle_count_dashboard'] });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const createPlan = useMutation({
    mutationFn: async (input: Partial<CycleCountPlan>) => {
      if (!orgId || !user) throw new Error('Sem organização');
      const { data, error } = await (supabase as any)
        .from('cycle_count_plans')
        .insert({ ...input, organization_id: orgId, created_by: user.id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Plano criado' });
      qc.invalidateQueries({ queryKey: ['cycle_count_plans'] });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const generateTasks = useMutation({
    mutationFn: async (planId: string) => {
      const { data, error } = await (supabase as any).rpc('generate_cycle_count_tasks', { p_plan_id: planId });
      if (error) throw error;
      return data;
    },
    onSuccess: (n) => {
      toast({ title: 'Tarefas geradas', description: `${n} tarefas pendentes criadas.` });
      qc.invalidateQueries({ queryKey: ['cycle_count_tasks'] });
      qc.invalidateQueries({ queryKey: ['cycle_count_dashboard'] });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const submitCount = useMutation({
    mutationFn: async ({ taskId, qtd, observacao, tolerancia }: { taskId: string; qtd: number; observacao?: string; tolerancia: number }) => {
      const { data: t } = await (supabase as any)
        .from('cycle_count_tasks').select('qtd_esperada').eq('id', taskId).single();
      const esperada = Number(t?.qtd_esperada ?? 0);
      const div = qtd - esperada;
      const divPct = esperada === 0 ? (qtd === 0 ? 0 : 100) : Math.abs(div / esperada) * 100;
      const dentro = divPct <= tolerancia;
      const status = dentro ? 'aprovada' : 'divergente';
      const { error } = await (supabase as any)
        .from('cycle_count_tasks')
        .update({
          qtd_contada: qtd, divergencia: div, observacao: observacao ?? null,
          status, ajuste_automatico: dentro,
          contado_por: user?.id, contado_em: new Date().toISOString(),
        })
        .eq('id', taskId);
      if (error) throw error;
      return { status };
    },
    onSuccess: (r) => {
      toast({ title: r.status === 'aprovada' ? 'Contagem aprovada' : 'Divergência registrada' });
      qc.invalidateQueries({ queryKey: ['cycle_count_tasks'] });
      qc.invalidateQueries({ queryKey: ['cycle_count_dashboard'] });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { recalcABC, createPlan, generateTasks, submitCount };
}
