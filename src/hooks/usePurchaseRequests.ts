import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { PurchasePriority, PurchaseStatus } from '@/lib/purchaseLabels';

export interface PurchaseRequest {
  id: string;
  organization_id: string;
  numero: string;
  solicitante_id: string;
  setor: string | null;
  unidade: string | null;
  cost_center_id: string | null;
  prioridade: PurchasePriority;
  categoria: string | null;
  item_descricao: string;
  quantidade: number;
  valor_estimado: number | null;
  justificativa: string | null;
  prazo_desejado: string | null;
  status: PurchaseStatus;
  responsavel_id: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequestFilters {
  status?: PurchaseStatus | 'all';
  prioridade?: PurchasePriority | 'all';
  search?: string;
  setor?: string;
}

export function usePurchaseRequests(filters: PurchaseRequestFilters = {}) {
  const { organization, isSuperAdmin } = useAuth();
  return useQuery({
    queryKey: ['purchase_requests', organization?.organization_id, filters],
    enabled: !!organization || isSuperAdmin,
    queryFn: async () => {
      let q = supabase.from('purchase_requests').select('*').order('created_at', { ascending: false });
      if (!isSuperAdmin && organization) q = q.eq('organization_id', organization.organization_id);
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.prioridade && filters.prioridade !== 'all') q = q.eq('prioridade', filters.prioridade);
      if (filters.setor) q = q.ilike('setor', `%${filters.setor}%`);
      if (filters.search) q = q.or(`numero.ilike.%${filters.search}%,item_descricao.ilike.%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PurchaseRequest[];
    },
  });
}

export function useCreatePurchaseRequest() {
  const qc = useQueryClient();
  const { user, organization } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: Omit<Partial<PurchaseRequest>, 'id' | 'numero'>) => {
      if (!user || !organization) throw new Error('Sem organização');
      const payload: any = {
        ...input,
        organization_id: organization.organization_id,
        solicitante_id: user.id,
      };
      const { data, error } = await supabase.from('purchase_requests').insert(payload).select().single();
      if (error) throw error;
      return data as PurchaseRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase_requests'] });
      toast({ title: 'Solicitação criada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdatePurchaseRequest() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<PurchaseRequest> & { id: string }) => {
      const { data, error } = await supabase.from('purchase_requests').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase_requests'] });
      toast({ title: 'Solicitação atualizada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
