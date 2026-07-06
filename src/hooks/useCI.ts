import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { CIStatus, CIPriority, CIChannel } from '@/lib/ciLabels';

export interface CIRequest {
  id: string;
  organization_id: string;
  protocol: string;
  channel: CIChannel;
  requester_name: string;
  requester_registration: string | null;
  requester_role: string | null;
  requester_sector: string | null;
  requester_whatsapp: string | null;
  requester_email: string | null;
  source_sector: string | null;
  destination_sector: string | null;
  request_type: string | null;
  subject: string;
  description: string | null;
  generated_description: string | null;
  priority: CIPriority;
  status: CIStatus;
  stock_checked: boolean;
  stock_available: boolean | null;
  stock_qty: number | null;
  purchase_request_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Campos novos (Fase 1)
  campus?: string | null;
  cost_center?: string | null;
  cost_center_id?: string | null;
  current_stage?: string | null;
  due_date?: string | null;
  delivery_forecast?: string | null;
  delivered_at?: string | null;
  assigned_to?: string | null;
  assigned_to_secondary?: string | null;
}

export interface CISubmitPayload {
  channel?: CIChannel;
  requester_name: string;
  requester_registration?: string;
  requester_role?: string;
  requester_sector?: string;
  requester_whatsapp?: string;
  requester_email?: string;
  source_sector?: string;
  destination_sector?: string;
  request_type?: string;
  subject: string;
  description?: string;
  generated_description?: string;
  priority?: CIPriority;
  organization_id?: string;
  created_by?: string;
}

export interface CIListFilters {
  status?: CIStatus | 'all';
  mine?: boolean;
  search?: string;
  campus?: string;
  cost_center?: string;
  channel?: CIChannel | 'all';
  stage?: string;
  responsible?: string;
  overdue?: boolean;
  urgent?: boolean;
  from?: string;
  to?: string;
}

export function useCIList(filters?: CIListFilters) {
  const { user, organization, isSuperAdmin } = useAuth();
  const mine = !!filters?.mine;
  return useQuery({
    queryKey: ['ci_requests', organization?.organization_id, filters, user?.id],
    enabled: !!user?.id && (mine || !!organization || isSuperAdmin),
    queryFn: async () => {
      let q = supabase.from('ci_requests' as any).select('*').order('created_at', { ascending: false });
      if (!mine && !isSuperAdmin && organization) q = q.eq('organization_id', organization.organization_id);
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (mine && user?.id) q = q.eq('created_by', user.id);
      if (filters?.campus) q = q.eq('campus', filters.campus);
      if (filters?.cost_center) q = q.eq('cost_center', filters.cost_center);
      if (filters?.channel && filters.channel !== 'all') q = q.eq('channel', filters.channel);
      if (filters?.stage) q = q.eq('current_stage', filters.stage);
      if (filters?.responsible) q = q.eq('assigned_to', filters.responsible);
      if (filters?.urgent) q = q.in('priority', ['alta', 'urgente']);
      if (filters?.from) q = q.gte('created_at', filters.from);
      if (filters?.to) q = q.lte('created_at', filters.to);
      if (filters?.search) q = q.or(`protocol.ilike.%${filters.search}%,subject.ilike.%${filters.search}%,requester_name.ilike.%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as unknown as CIRequest[];
      if (filters?.overdue) {
        const now = Date.now();
        rows = rows.filter(r => r.due_date && new Date(r.due_date).getTime() < now
          && !['finalizada', 'cancelada', 'reprovada'].includes(r.status));
      }
      return rows;
    },
  });
}

export function useCI(id: string | undefined) {
  return useQuery({
    queryKey: ['ci_request', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('ci_requests' as any).select('*').eq('id', id!).single();
      if (error) throw error;
      return data as unknown as CIRequest;
    },
  });
}

export function useCIHistory(id: string | undefined) {
  return useQuery({
    queryKey: ['ci_history', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('ci_status_history' as any)
        .select('*').eq('ci_id', id!).order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCIComments(id: string | undefined) {
  const qc = useQueryClient();
  const { user, organization } = useAuth();
  const { toast } = useToast();
  const list = useQuery({
    queryKey: ['ci_comments', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('ci_comments' as any)
        .select('*').eq('ci_id', id!).order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const add = useMutation({
    mutationFn: async (content: string) => {
      if (!id || !user || !organization) throw new Error('missing context');
      const { error } = await supabase.from('ci_comments' as any).insert({
        ci_id: id,
        organization_id: organization.organization_id,
        author_id: user.id,
        author_name: user.email,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ci_comments', id] }),
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
  return { ...list, add };
}

export function useSubmitCI() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: CISubmitPayload) => {
      const { data, error } = await supabase.rpc('submit_ci' as any, { payload: payload as any });
      if (error) throw error;
      return data as { id: string; protocol: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ci_requests'] });
      toast({ title: 'CI registrada com sucesso' });
    },
    onError: (e: any) => toast({ title: 'Erro ao registrar CI', description: e.message, variant: 'destructive' }),
  });
}

export function useCILookup() {
  return useMutation({
    mutationFn: async (vars: { protocol: string; registration?: string }) => {
      const { data, error } = await supabase.rpc('ci_lookup' as any, {
        p_protocol: vars.protocol, p_registration: vars.registration ?? null,
      });
      if (error) throw error;
      return data as any;
    },
  });
}

export function useUpdateCIStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (vars: { id: string; status: CIStatus }) => {
      const { error } = await supabase.from('ci_requests' as any)
        .update({ status: vars.status }).eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      invalidateCI(qc, v.id);
      toast({ title: 'Status atualizado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function usePromoteCIToPurchase() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('ci_promote_to_purchase' as any, { p_ci_id: id });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_d, id) => {
      invalidateCI(qc, id);
      toast({ title: 'Solicitação de compra criada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useAdvanceCIPurchaseStage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (vars: { id: string; status: CIStatus }) => {
      const { error } = await supabase.rpc('ci_advance_purchase_stage' as any, {
        p_ci_id: vars.id,
        p_to_status: vars.status,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      invalidateCI(qc, vars.id);
      toast({ title: 'Etapa de compra atualizada' });
    },
    onError: (error: Error) => toast({
      title: 'Não foi possível avançar a CI',
      description: error.message,
      variant: 'destructive',
    }),
  });
}

export function useCIStockCheck() {
  return useMutation({
    mutationFn: async (term: string) => {
      const { data, error } = await supabase.rpc('ci_check_stock' as any, { p_term: term });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; sku: string; current_stock: number; min_stock: number }>;
    },
  });
}

function invalidateCI(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.invalidateQueries({ queryKey: ['ci_requests'] });
  qc.invalidateQueries({ queryKey: ['ci_request', id] });
  qc.invalidateQueries({ queryKey: ['ci_history', id] });
  // EsteiraDetalhe consome este cache — invalidar para refletir aprovação/distribuição sem F5
  qc.invalidateQueries({ queryKey: ['purchase_pipeline'] });
  qc.invalidateQueries({ queryKey: ['approval_steps'] });
}

export function useApproveCI() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (vars: { id: string; comentario?: string }) => {
      const { error } = await supabase.rpc('ci_approve' as any, { _id: vars.id, _comentario: vars.comentario ?? null });
      if (error) throw error;
    },
    onSuccess: (_d, v) => { invalidateCI(qc, v.id); toast({ title: 'CI aprovada' }); },
    onError: (e: any) => toast({ title: 'Erro ao aprovar', description: e.message, variant: 'destructive' }),
  });
}

export function useRejectCI() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (vars: { id: string; motivo: string }) => {
      const { error } = await supabase.rpc('ci_reject' as any, { _id: vars.id, _motivo: vars.motivo });
      if (error) throw error;
    },
    onSuccess: (_d, v) => { invalidateCI(qc, v.id); toast({ title: 'CI reprovada' }); },
    onError: (e: any) => toast({ title: 'Erro ao reprovar', description: e.message, variant: 'destructive' }),
  });
}

export function useAssignBuyerCI() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (vars: { id: string; buyer_id: string; secondary?: string | null }) => {
      const { error } = await supabase.rpc('ci_assign_buyer' as any, {
        _id: vars.id, _buyer_id: vars.buyer_id, _secondary: vars.secondary ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => { invalidateCI(qc, v.id); toast({ title: 'CI distribuída ao comprador' }); },
    onError: (e: any) => toast({ title: 'Erro ao distribuir', description: e.message, variant: 'destructive' }),
  });
}

export function useOrgBuyers() {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ['org_buyers', organization?.organization_id],
    enabled: !!organization,
    queryFn: async () => {
      const ALLOWED = ['compras'];
      const { data, error } = await supabase
        .from('organization_members')
        .select('user_id, role, is_active')
        .eq('organization_id', organization!.organization_id)
        .eq('is_active', true)
        .in('role', ALLOWED);
      if (error) throw error;
      const ids = (data ?? []).map((m: any) => m.user_id);
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from('profiles').select('id, full_name, email, avatar_url').in('id', ids);
      const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const ROLE_LABEL: Record<string, string> = {
        compras: 'Comprador',
      };
      return (data ?? [])
        .map((m: any) => ({
          user_id: m.user_id,
          role: m.role,
          role_label: ROLE_LABEL[m.role] ?? m.role,
          full_name: pmap.get(m.user_id)?.full_name ?? null,
          email: pmap.get(m.user_id)?.email ?? null,
          avatar_url: pmap.get(m.user_id)?.avatar_url ?? null,
        }))
        .sort((a, b) => (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '', 'pt-BR'));
    },
  });
}

// ============ Fluxograma oficial: ações por papel ============

function makeWorkflowMutation<TVars extends { id: string }>(
  rpcName: string,
  buildArgs: (v: TVars) => Record<string, any>,
  successMsg: string,
) {
  return () => {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
      mutationFn: async (vars: TVars) => {
        const { error } = await supabase.rpc(rpcName as any, buildArgs(vars));
        if (error) throw error;
      },
      onSuccess: (_d, v) => { invalidateCI(qc, v.id); toast({ title: successMsg }); },
      onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
    });
  };
}

export const useRequestTechnicalReview = makeWorkflowMutation<{ id: string; comentario?: string }>(
  'ci_request_technical_review',
  (v) => ({ _id: v.id, _comentario: v.comentario ?? null }),
  'Enviado para a Engenheira',
);

export const useRequestRegulatoryReview = makeWorkflowMutation<{ id: string; comentario?: string }>(
  'ci_request_regulatory_review',
  (v) => ({ _id: v.id, _comentario: v.comentario ?? null }),
  'Enviado para Validação Regulatória',
);

export const useRegulatoryApprove = makeWorkflowMutation<{ id: string; parecer?: string }>(
  'ci_regulatory_approve',
  (v) => ({ _id: v.id, _parecer: v.parecer ?? null }),
  'OK regulatório registrado',
);

export const useRegulatoryRequestAdjustment = makeWorkflowMutation<{ id: string; motivo: string }>(
  'ci_regulatory_request_adjustment',
  (v) => ({ _id: v.id, _motivo: v.motivo }),
  'Ajuste regulatório solicitado',
);

export const useEngineerRequestAdjustment = makeWorkflowMutation<{ id: string; motivo: string }>(
  'ci_engineer_request_adjustment',
  (v) => ({ _id: v.id, _motivo: v.motivo }),
  'Ajuste solicitado',
);

export const useEngineerApprove = makeWorkflowMutation<{ id: string; parecer?: string }>(
  'ci_engineer_approve',
  (v) => ({ _id: v.id, _parecer: v.parecer ?? null }),
  'OK técnico registrado',
);

export const useCoordinatorApprove = makeWorkflowMutation<{ id: string; comentario?: string }>(
  'ci_coordinator_approve',
  (v) => ({ _id: v.id, _comentario: v.comentario ?? null }),
  'Aprovado e liberado para cotação',
);

export const useRequestSuperiorApproval = makeWorkflowMutation<{ id: string; motivo?: string }>(
  'ci_request_superior_approval',
  (v) => ({ _id: v.id, _motivo: v.motivo ?? null }),
  'Aprovação superior solicitada',
);

export const useManagerSendToCouncil = makeWorkflowMutation<{ id: string; comentario?: string }>(
  'ci_manager_send_to_council',
  (v) => ({ _id: v.id, _comentario: v.comentario ?? null }),
  'Encaminhado ao Conselho',
);

export const useCouncilDecide = makeWorkflowMutation<{ id: string; decisao: 'aprovado' | 'revisao' | 'desaprovado'; comentario?: string }>(
  'ci_council_decide',
  (v) => ({ _id: v.id, _decisao: v.decisao, _comentario: v.comentario ?? null }),
  'Decisão do Conselho registrada',
);

