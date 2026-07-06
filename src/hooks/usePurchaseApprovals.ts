import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseStatus } from '@/lib/purchaseLabels';

export interface ApprovalStep {
  id: string;
  request_id: string;
  organization_id: string;
  ordem: number;
  papel_aprovador: 'compras' | 'gestor_aprovador' | 'administrador';
  status: 'pendente' | 'aprovada' | 'reprovada' | 'pulada';
  aprovador_id: string | null;
  comentario: string | null;
  decidido_em: string | null;
  created_at: string;
}

export interface HistoryEvent {
  id: string;
  request_id: string;
  organization_id: string;
  actor_id: string | null;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  payload: any;
  created_at: string;
}

export function useApprovalChain(requestId: string | undefined) {
  return useQuery({
    queryKey: ['purchase_request_approvals', requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_request_approvals' as any)
        .select('*')
        .eq('request_id', requestId!)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ApprovalStep[];
    },
  });
}

export function usePurchaseRequestHistory(requestId: string | undefined) {
  return useQuery({
    queryKey: ['purchase_request_history', requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_request_history' as any)
        .select('*')
        .eq('request_id', requestId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as HistoryEvent[];
    },
  });
}

export function useSubmitForApproval() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('submit_purchase_request' as any, { _request_id: requestId });
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['purchase_requests'] });
      qc.invalidateQueries({ queryKey: ['purchase_request_approvals', id] });
      qc.invalidateQueries({ queryKey: ['purchase_request_history', id] });
      toast({ title: 'Solicitação enviada para aprovação' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (vars: { requestId: string; decision: 'aprovada' | 'reprovada'; comentario?: string }) => {
      const { error } = await supabase.rpc('decide_approval' as any, {
        _request_id: vars.requestId,
        _decision: vars.decision,
        _comentario: vars.comentario ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['purchase_requests'] });
      qc.invalidateQueries({ queryKey: ['purchase_request_approvals', v.requestId] });
      qc.invalidateQueries({ queryKey: ['purchase_request_history', v.requestId] });
      toast({ title: v.decision === 'aprovada' ? 'Etapa aprovada' : 'Solicitação reprovada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useChangeRequestStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PurchaseStatus }) => {
      const { error } = await supabase
        .from('purchase_requests')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase_requests'] });
    },
    onError: (e: any) => toast({ title: 'Não foi possível mover', description: e.message, variant: 'destructive' }),
  });
}
