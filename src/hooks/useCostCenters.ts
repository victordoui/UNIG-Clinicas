import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface CostCenter {
  id: string;
  organization_id: string;
  nome: string;
  codigo: string;
  classificacao: string | null;
  unidade_polo: string | null;
  campus: string | null;
  setor_departamento: string | null;
  responsavel_id: string | null;
  ativo: boolean;
  observacoes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CostCenterInput = Pick<
  CostCenter,
  'nome' | 'codigo' | 'classificacao' | 'unidade_polo' | 'campus' | 'setor_departamento' | 'ativo' | 'observacoes'
> & {
  id?: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
}

function normalizeInput(input: Partial<CostCenterInput>, organizationId: string, userId?: string) {
  return {
    organization_id: organizationId,
    nome: input.nome?.trim(),
    codigo: input.codigo?.trim(),
    classificacao: input.classificacao?.trim() || null,
    unidade_polo: input.unidade_polo?.trim() || null,
    campus: input.campus?.trim() || input.unidade_polo?.trim() || null,
    setor_departamento: input.setor_departamento?.trim() || input.nome?.trim() || null,
    ativo: input.ativo ?? true,
    observacoes: input.observacoes?.trim() || null,
    updated_by: userId ?? null,
    ...(input.id ? {} : { created_by: userId ?? null }),
  };
}

export function useCostCenters(options?: { activeOnly?: boolean }) {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['cost_centers', orgId, options?.activeOnly ?? false],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from('cost_centers')
        .select('*')
        .eq('organization_id', orgId)
        .order('unidade_polo', { ascending: true })
        .order('codigo', { ascending: true });

      if (options?.activeOnly) query = query.eq('ativo', true);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CostCenter[];
    },
  });
}

export function useUpsertCostCenter() {
  const { organization, user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: CostCenterInput) => {
      if (!organization) throw new Error('Sem organização');
      if (!input.nome?.trim() || !input.codigo?.trim() || !input.classificacao?.trim() || !input.unidade_polo?.trim()) {
        throw new Error('Preencha nome, código, classificação e unidade.');
      }

      const payload = normalizeInput(input, organization.organization_id, user?.id);
      const table = supabase.from('cost_centers') as any;
      const request = input.id
        ? table.update(payload).eq('id', input.id).select().single()
        : table.insert(payload).select().single();

      const { data, error } = await request;
      if (error) throw error;
      return data as CostCenter;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cost_centers'] });
      qc.invalidateQueries({ queryKey: ['my_cost_centers'] });
      toast({ title: 'Centro de custo salvo' });
    },
    onError: (e: unknown) => toast({ title: 'Erro ao salvar', description: getErrorMessage(e), variant: 'destructive' }),
  });
}

export function useBulkUpsertCostCenters() {
  const { organization, user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (items: CostCenterInput[]) => {
      if (!organization) throw new Error('Sem organização');
      const payload = items.map((item) => normalizeInput(item, organization.organization_id, user?.id));
      const { data, error } = await (supabase.from('cost_centers') as any)
        .upsert(payload, { onConflict: 'organization_id,unidade_polo,codigo' })
        .select();
      if (error) throw error;

      await (supabase.rpc as any)('log_cost_center_bulk_action', {
        _action: 'cost_center_imported',
        _organization_id: organization.organization_id,
        _details: {
          total: payload.length,
          codigos: payload.map((item) => item.codigo),
        },
      });

      return (data ?? []) as CostCenter[];
    },
    onSuccess: (_data, items) => {
      qc.invalidateQueries({ queryKey: ['cost_centers'] });
      qc.invalidateQueries({ queryKey: ['my_cost_centers'] });
      toast({ title: 'Importação concluída', description: `${items.length} registro(s) processado(s).` });
    },
    onError: (e: unknown) => toast({ title: 'Erro na importação', description: getErrorMessage(e), variant: 'destructive' }),
  });
}

export function useSetCostCenterStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data, error } = await (supabase.from('cost_centers') as any)
        .update({ ativo, updated_by: user?.id ?? null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as CostCenter;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['cost_centers'] });
      qc.invalidateQueries({ queryKey: ['my_cost_centers'] });
      toast({ title: input.ativo ? 'Centro de custo reativado' : 'Centro de custo inativado' });
    },
    onError: (e: unknown) => toast({ title: 'Erro', description: getErrorMessage(e), variant: 'destructive' }),
  });
}

export function useDeleteCostCenter() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('cost_centers').delete().eq('id', id).select();
      if (error) throw error;
      if (!data?.length) throw new Error('Não foi possível excluir. Verifique vínculos existentes.');
      return data[0] as CostCenter;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cost_centers'] });
      qc.invalidateQueries({ queryKey: ['my_cost_centers'] });
      toast({ title: 'Centro de custo excluído' });
    },
    onError: (e: unknown) => toast({ title: 'Erro ao excluir', description: getErrorMessage(e), variant: 'destructive' }),
  });
}

export function useLogCostCenterExport() {
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async (details: Record<string, unknown>) => {
      if (!organization) return;
      await (supabase.rpc as any)('log_cost_center_bulk_action', {
        _action: 'cost_center_exported',
        _organization_id: organization.organization_id,
        _details: details,
      });
    },
  });
}
