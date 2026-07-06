import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export interface UserCostCenterLink {
  id: string;
  user_id: string;
  cost_center_id: string;
  organization_id: string;
  is_default: boolean;
  can_request: boolean;
  can_approve_cc: boolean;
  created_at: string;
}

export interface UserCostCenterOption {
  id: string;
  nome: string;
  codigo: string;
  classificacao?: string | null;
  unidade_polo?: string | null;
  campus?: string | null;
  setor_departamento?: string | null;
  is_default: boolean;
  can_approve_cc: boolean;
}

type UserCostCenterInsert = Database['public']['Tables']['user_cost_centers']['Insert'];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
}

/** RPC: cost centers the current user is allowed to request from. */
export function useMyCostCenters() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ['my_cost_centers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_cost_centers', { _user_id: user!.id });
      if (error) throw error;
      return (data ?? []) as UserCostCenterOption[];
    },
  });
}

/** Admin/manager view: all links of the organization, optionally filtered by CC. */
export function useUserCostCenterLinks(costCenterId?: string) {
  const { organization } = useAuth();
  return useQuery({
    enabled: !!organization,
    queryKey: ['user_cost_centers', organization?.organization_id, costCenterId],
    queryFn: async () => {
      let q = supabase
        .from('user_cost_centers')
        .select('*')
        .eq('organization_id', organization!.organization_id);
      if (costCenterId) q = q.eq('cost_center_id', costCenterId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as UserCostCenterLink[];
    },
  });
}

export function useUpsertUserCostCenter() {
  const qc = useQueryClient();
  const { user, organization } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: Partial<UserCostCenterLink> & { user_id: string; cost_center_id: string }) => {
      if (!organization) throw new Error('Sem organização');
      const payload: UserCostCenterInsert = {
        ...input,
        organization_id: organization.organization_id,
        created_by: user?.id,
      };
      const { data, error } = await supabase
        .from('user_cost_centers')
        .upsert(payload, { onConflict: 'user_id,cost_center_id' })
        .select()
        .single();
      if (error) throw error;
      return data as UserCostCenterLink;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user_cost_centers'] });
      qc.invalidateQueries({ queryKey: ['my_cost_centers'] });
      toast({ title: 'Vínculo salvo' });
    },
    onError: (e: unknown) => toast({ title: 'Erro', description: getErrorMessage(e), variant: 'destructive' }),
  });
}

export function useDeleteUserCostCenter() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, data } = await supabase
        .from('user_cost_centers')
        .delete()
        .eq('id', id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Não foi possível remover o vínculo');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user_cost_centers'] });
      qc.invalidateQueries({ queryKey: ['my_cost_centers'] });
      toast({ title: 'Vínculo removido' });
    },
    onError: (e: unknown) => toast({ title: 'Erro', description: getErrorMessage(e), variant: 'destructive' }),
  });
}
