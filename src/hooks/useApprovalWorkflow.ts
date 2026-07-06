import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ApprovalStepType = 'unico' | 'paralelo' | 'qualquer_um';
export type ApprovalRequestStatus = 'pendente' | 'aprovado' | 'rejeitado' | 'cancelado' | 'escalonado';
export type ApprovalStepStatus = 'aguardando' | 'pendente' | 'aprovado' | 'rejeitado' | 'escalonado' | 'pulado';

export interface ApprovalWorkflow {
  id: string;
  organization_id: string;
  nome: string;
  descricao: string | null;
  referencia_tipo: 'purchase_request' | 'purchase_order';
  valor_min: number | null;
  valor_max: number | null;
  categoria: string | null;
  cost_center_id: string | null;
  prioridade: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApprovalWorkflowStep {
  id: string;
  workflow_id: string;
  ordem: number;
  nome: string;
  tipo: ApprovalStepType;
  aprovador_user_id: string | null;
  aprovador_papel: string | null;
  valor_min: number | null;
  sla_horas: number | null;
  escalona_para: string | null;
}

export interface ApprovalRequest {
  id: string;
  organization_id: string;
  workflow_id: string | null;
  workflow_snapshot: any;
  referencia_tipo: 'purchase_request' | 'purchase_order';
  referencia_id: string;
  valor: number | null;
  status: ApprovalRequestStatus;
  etapa_atual: number;
  solicitante_user_id: string | null;
  iniciado_em: string;
  concluido_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequestStep {
  id: string;
  request_id: string;
  ordem: number;
  nome: string;
  tipo: ApprovalStepType;
  aprovador_user_id: string | null;
  aprovador_papel: string | null;
  status: ApprovalStepStatus;
  decidido_por: string | null;
  decidido_em: string | null;
  comentario: string | null;
  prazo_em: string | null;
  escalona_para: string | null;
}

export interface ApprovalDelegation {
  id: string;
  organization_id: string;
  origem_user_id: string;
  destino_user_id: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  motivo: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useApprovalWorkflows() {
  return useQuery({
    queryKey: ['approval_workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_workflows' as any)
        .select('*')
        .order('prioridade', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ApprovalWorkflow[];
    },
  });
}

export function useApprovalWorkflowSteps(workflowId: string | undefined) {
  return useQuery({
    queryKey: ['approval_workflow_steps', workflowId],
    enabled: !!workflowId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_workflow_steps' as any)
        .select('*')
        .eq('workflow_id', workflowId!)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ApprovalWorkflowStep[];
    },
  });
}

export function useSaveWorkflow() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { workflow: Partial<ApprovalWorkflow>; steps: Partial<ApprovalWorkflowStep>[] }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');
      const { data: org } = await supabase.rpc('get_user_organization_id' as any);
      let workflowId = input.workflow.id;
      if (workflowId) {
        const { error } = await supabase
          .from('approval_workflows' as any)
          .update(input.workflow as any)
          .eq('id', workflowId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('approval_workflows' as any)
          .insert({ ...input.workflow, organization_id: org, created_by: session.user.id } as any)
          .select()
          .single();
        if (error) throw error;
        workflowId = (data as any).id;
      }
      // replace steps
      await supabase.from('approval_workflow_steps' as any).delete().eq('workflow_id', workflowId);
      if (input.steps.length > 0) {
        const stepsToInsert = input.steps.map((s, i) => ({
          ...s,
          workflow_id: workflowId,
          ordem: s.ordem ?? i + 1,
        }));
        const { error } = await supabase.from('approval_workflow_steps' as any).insert(stepsToInsert as any);
        if (error) throw error;
      }
      return workflowId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval_workflows'] });
      qc.invalidateQueries({ queryKey: ['approval_workflow_steps'] });
      toast({ title: 'Fluxo salvo' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('approval_workflows' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval_workflows'] });
      toast({ title: 'Fluxo removido' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

async function fetchActiveDelegationOrigins(destinoUserId: string): Promise<string[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('approval_delegations' as any)
    .select('origem_user_id')
    .eq('destino_user_id', destinoUserId)
    .eq('ativo', true)
    .lte('vigencia_inicio', today)
    .gte('vigencia_fim', today);
  if (error) return [];
  return ((data ?? []) as any[]).map((d) => d.origem_user_id);
}

export function useApprovalRequests(filter: 'pending_for_me' | 'mine' | 'all' = 'pending_for_me') {
  return useQuery({
    queryKey: ['approval_requests', filter],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      let q = supabase
        .from('approval_requests' as any)
        .select('*, approval_request_steps(*)')
        .order('iniciado_em', { ascending: false })
        .limit(200);
      if (filter === 'mine') q = q.eq('solicitante_user_id', session.user.id);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as any[];
      if (filter === 'pending_for_me') {
        const delegatedOrigins = await fetchActiveDelegationOrigins(session.user.id);
        rows = rows
          .filter(r => r.status === 'pendente')
          .map(r => {
            const steps = r.approval_request_steps || [];
            const mineStep = steps.find((s: any) => s.status === 'pendente' && s.aprovador_user_id === session.user.id);
            if (mineStep) return r;
            const delegatedStep = steps.find(
              (s: any) => s.status === 'pendente' && s.aprovador_user_id && delegatedOrigins.includes(s.aprovador_user_id),
            );
            if (delegatedStep) return { ...r, _delegatedFrom: delegatedStep.aprovador_user_id };
            return null;
          })
          .filter(Boolean);
      }
      return rows as Array<ApprovalRequest & { approval_request_steps: ApprovalRequestStep[]; _delegatedFrom?: string }>;
    },
  });
}

export function useApprovalRequest(id: string | undefined) {
  return useQuery({
    queryKey: ['approval_request', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_requests' as any)
        .select('*, approval_request_steps(*)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as (ApprovalRequest & { approval_request_steps: ApprovalRequestStep[] }) | null;
    },
  });
}

export function useApprovalRequestByReference(referencia_tipo: string, referencia_id: string | undefined) {
  return useQuery({
    queryKey: ['approval_request_by_ref', referencia_tipo, referencia_id],
    enabled: !!referencia_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_requests' as any)
        .select('*, approval_request_steps(*)')
        .eq('referencia_tipo', referencia_tipo)
        .eq('referencia_id', referencia_id!)
        .order('iniciado_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as (ApprovalRequest & { approval_request_steps: ApprovalRequestStep[] }) | null;
    },
  });
}

export function useDecideStep() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ stepId, decisao, comentario }: { stepId: string; decisao: 'aprovado' | 'rejeitado'; comentario?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');
      const { data, error } = await supabase.rpc('decide_approval_step' as any, {
        _step_id: stepId,
        _decisao: decisao,
        _comentario: comentario ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval_requests'] });
      qc.invalidateQueries({ queryKey: ['approval_request'] });
      qc.invalidateQueries({ queryKey: ['approval_request_by_ref'] });
      toast({ title: 'Decisão registrada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useStartApprovalRequest() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { referencia_tipo: 'purchase_request' | 'purchase_order'; referencia_id: string; valor?: number; categoria?: string; cost_center_id?: string }) => {
      const { data, error } = await supabase.rpc('start_approval_request' as any, {
        _referencia_tipo: input.referencia_tipo,
        _referencia_id: input.referencia_id,
        _valor: input.valor ?? null,
        _categoria: input.categoria ?? null,
        _cost_center_id: input.cost_center_id ?? null,
      });
      if (error) throw error;
      return data as string | null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval_requests'] });
      qc.invalidateQueries({ queryKey: ['approval_request_by_ref'] });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useApprovalDelegations() {
  return useQuery({
    queryKey: ['approval_delegations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_delegations' as any)
        .select('*')
        .order('vigencia_inicio', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ApprovalDelegation[];
    },
  });
}

export function useSaveDelegation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: Partial<ApprovalDelegation>) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');
      const { data: org } = await supabase.rpc('get_user_organization_id' as any);
      if (input.id) {
        const { error } = await supabase.from('approval_delegations' as any).update(input as any).eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('approval_delegations' as any).insert({
          ...input,
          organization_id: org,
          created_by: session.user.id,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval_delegations'] });
      toast({ title: 'Delegação salva' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useMyPendingApprovals() {
  return useQuery({
    queryKey: ['my_pending_approvals'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { count: 0, nextDeadline: null as string | null };
      const delegatedOrigins = await fetchActiveDelegationOrigins(session.user.id);
      const approverIds = Array.from(new Set([session.user.id, ...delegatedOrigins]));
      const { data, error } = await supabase
        .from('approval_request_steps' as any)
        .select('id, prazo_em, aprovador_user_id, status, request_id, approval_requests!inner(status)')
        .eq('status', 'pendente')
        .in('aprovador_user_id', approverIds);
      if (error) throw error;
      const rows = ((data ?? []) as any[]).filter(
        r => r.approval_requests?.status === 'pendente'
      );
      const deadlines = rows
        .map(r => r.prazo_em)
        .filter((d: string | null): d is string => !!d)
        .sort();
      return { count: rows.length, nextDeadline: deadlines[0] ?? null };
    },
    refetchInterval: 60000,
  });
}

export function useDeleteDelegation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('approval_delegations' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval_delegations'] });
      toast({ title: 'Delegação removida' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
