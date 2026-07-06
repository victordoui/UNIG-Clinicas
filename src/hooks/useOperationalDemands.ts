import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export const DEMAND_STATUS = [
  'rascunho', 'registrada', 'em_analise', 'em_planejamento',
  'aguardando_aprovacao', 'aguardando_orcamento', 'aguardando_compra',
  'aguardando_equipe', 'aguardando_fornecedor', 'em_execucao',
  'pausada', 'concluida', 'cancelada',
] as const;
export type DemandStatus = typeof DEMAND_STATUS[number];

export const DEMAND_STATUS_LABEL: Record<DemandStatus, string> = {
  rascunho: 'Rascunho',
  registrada: 'Registrada',
  em_analise: 'Em análise',
  em_planejamento: 'Em planejamento',
  aguardando_aprovacao: 'Aguardando aprovação',
  aguardando_orcamento: 'Aguardando orçamento',
  aguardando_compra: 'Aguardando compra/material',
  aguardando_equipe: 'Aguardando equipe',
  aguardando_fornecedor: 'Aguardando fornecedor',
  em_execucao: 'Em execução',
  pausada: 'Pausada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const DEMAND_PRIORITY = ['baixa', 'media', 'alta', 'urgente'] as const;
export type DemandPriority = typeof DEMAND_PRIORITY[number];
export const DEMAND_PRIORITY_LABEL: Record<DemandPriority, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente',
};

export const DEMAND_TYPE = [
  'projeto_operacional','demanda_administrativa','melhoria_unidade',
  'reforma_adequacao','manutencao_planejada','apoio_evento',
  'implantacao_processo','organizacao_ambiente','compra_operacao',
  'ajuste_estrutural','solicitacao_estrategica','outro',
] as const;
export type DemandType = typeof DEMAND_TYPE[number];
export const DEMAND_TYPE_LABEL: Record<DemandType, string> = {
  projeto_operacional: 'Projeto operacional',
  demanda_administrativa: 'Demanda administrativa',
  melhoria_unidade: 'Melhoria de unidade',
  reforma_adequacao: 'Reforma ou adequação',
  manutencao_planejada: 'Manutenção planejada',
  apoio_evento: 'Apoio a evento',
  implantacao_processo: 'Implantação de processo',
  organizacao_ambiente: 'Organização de ambiente',
  compra_operacao: 'Compra relacionada à operação',
  ajuste_estrutural: 'Ajuste estrutural',
  solicitacao_estrategica: 'Solicitação estratégica',
  outro: 'Outro',
};

export const FINAL_STATUSES: DemandStatus[] = ['concluida', 'cancelada'];

export interface OperationalDemand {
  id: string;
  organization_id: string;
  code: string;
  nome: string;
  tipo: DemandType;
  unidade: string;
  campus_id: string | null;
  area: string | null;
  gestor_responsavel: string;
  prioridade: DemandPriority;
  objetivo: string;
  descricao: string | null;
  resultado_esperado: string | null;
  status: DemandStatus;
  proximas_etapas: string | null;
  prazo_estimado: string | null;
  resumo_final: string | null;
  motivo_pausa: string | null;
  justificativa_cancelamento: string | null;
  concluida_em: string | null;
  arquivada: boolean;
  is_overdue?: boolean;
  dependencies?: string | null;
  attention_points?: string | null;
  manager_summary?: string | null;
  last_summary_generated_at?: string | null;
  last_summary_generated_by?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  gestor?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export type DemandInput = Partial<Omit<OperationalDemand, 'id' | 'created_at' | 'updated_at' | 'gestor' | 'code'>>;

const QK = ['operational_demands'];

export function isOverdue(d: Pick<OperationalDemand, 'prazo_estimado' | 'status'>) {
  if (!d.prazo_estimado) return false;
  if (FINAL_STATUSES.includes(d.status)) return false;
  return new Date(d.prazo_estimado) < new Date(new Date().toDateString());
}

const MANAGER_VIEW_ROLES = ['super_admin', 'administrador', 'gerente_geral', 'coordenador_operacoes'] as const;

export function useIsDemandsManagerView() {
  const { unigRole } = useAuth();
  return (MANAGER_VIEW_ROLES as readonly string[]).includes(unigRole as string);
}

export function useOperationalDemands(filters?: {
  status?: DemandStatus | 'all';
  prioridade?: DemandPriority | 'all';
  gestorId?: string | 'all';
  unidade?: string | 'all';
  search?: string;
}) {
  const qc = useQueryClient();
  const { profile, unigRole } = useAuth();
  const isManagerView = (MANAGER_VIEW_ROLES as readonly string[]).includes(unigRole as string);
  const forcedGestorId = !isManagerView && unigRole === 'gestor' ? profile?.id ?? null : null;

  useEffect(() => {
    const ch = supabase
      .channel('operational_demands_rt_' + Math.random().toString(36).slice(2, 8))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operational_demands' },
        () => qc.invalidateQueries({ queryKey: QK }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return useQuery({
    queryKey: [...QK, filters, forcedGestorId],
    queryFn: async () => {
      let q = supabase
        .from('operational_demands' as never)
        .select('*, gestor:profiles!operational_demands_gestor_responsavel_fkey(id, full_name, avatar_url)')
        .order('created_at', { ascending: false });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.prioridade && filters.prioridade !== 'all') q = q.eq('prioridade', filters.prioridade);
      const gestorId = forcedGestorId ?? (filters?.gestorId && filters.gestorId !== 'all' ? filters.gestorId : null);
      if (gestorId) q = q.eq('gestor_responsavel', gestorId);
      if (filters?.unidade && filters.unidade !== 'all') q = q.eq('unidade', filters.unidade);
      if (filters?.search) q = q.ilike('nome', `%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as OperationalDemand[]) ?? [];
    },
  });
}

/** Unidades extras (multi) vinculadas a uma demanda. */
export function useDemandUnits(demandId: string | undefined) {
  return useQuery({
    queryKey: ['operational_demand_units', demandId],
    enabled: !!demandId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_demand_units' as never)
        .select('*')
        .eq('demand_id', demandId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as unknown as any[]) ?? [];
    },
  });
}

/** Substitui as unidades de uma demanda pela lista informada (nomes em texto). */
export function useReplaceDemandUnits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ demandId, organizationId, units }: { demandId: string; organizationId: string; units: string[] }) => {
      await supabase.from('operational_demand_units' as never).delete().eq('demand_id', demandId);
      if (units.length === 0) return;
      const rows = units.map((u) => ({
        demand_id: demandId, organization_id: organizationId, unit_name_fallback: u,
      }));
      const { error } = await supabase.from('operational_demand_units' as never).insert(rows as never);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['operational_demand_units', vars.demandId] });
    },
  });
}

export function useOperationalDemand(id: string | undefined) {
  return useQuery({
    queryKey: ['operational_demand', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_demands' as never)
        .select('*, gestor:profiles!operational_demands_gestor_responsavel_fkey(id, full_name, avatar_url)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as OperationalDemand | null;
    },
  });
}

export function useDemandUpdates(demandId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!demandId) return;
    const ch = supabase.channel('od_updates_' + demandId + '_' + Math.random().toString(36).slice(2, 8))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operational_demand_updates', filter: `demand_id=eq.${demandId}` },
        () => qc.invalidateQueries({ queryKey: ['operational_demand_updates', demandId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [demandId, qc]);

  return useQuery({
    queryKey: ['operational_demand_updates', demandId],
    enabled: !!demandId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_demand_updates' as never)
        .select('*, author:profiles!operational_demand_updates_autor_fkey(id, full_name, avatar_url)')
        .eq('demand_id', demandId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as any[]) ?? [];
    },
  });
}

export function useDemandActivity(demandId: string | undefined) {
  return useQuery({
    queryKey: ['operational_demand_activity', demandId],
    enabled: !!demandId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_demand_activity_log' as never)
        .select('*, author:profiles!operational_demand_activity_log_autor_fkey(id, full_name)')
        .eq('demand_id', demandId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as any[]) ?? [];
    },
  });
}

export function useDemandComments(demandId: string | undefined) {
  return useQuery({
    queryKey: ['operational_demand_comments', demandId],
    enabled: !!demandId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_demand_comments' as never)
        .select('*, author:profiles!operational_demand_comments_autor_fkey(id, full_name, avatar_url)')
        .eq('demand_id', demandId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as any[]) ?? [];
    },
  });
}

export function useDemandAttachments(demandId: string | undefined) {
  return useQuery({
    queryKey: ['operational_demand_attachments', demandId],
    enabled: !!demandId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_demand_attachments' as never)
        .select('*')
        .eq('demand_id', demandId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as any[]) ?? [];
    },
  });
}

export function useCreateDemand() {
  const qc = useQueryClient();
  const { profile, organization } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: DemandInput) => {
      if (!organization?.organization_id) throw new Error('Organização não encontrada');
      const payload: any = {
        ...input,
        organization_id: organization?.organization_id,
        created_by: profile.id,
      };
      const { data, error } = await supabase
        .from('operational_demands' as never)
        .insert(payload as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as OperationalDemand;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast({ title: 'Demanda criada', description: 'A demanda foi registrada com sucesso.' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateDemand() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...patch }: DemandInput & { id: string }) => {
      const { data, error } = await supabase
        .from('operational_demands' as never)
        .update(patch as never)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as OperationalDemand;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: QK });
      qc.invalidateQueries({ queryKey: ['operational_demand', d.id] });
      qc.invalidateQueries({ queryKey: ['operational_demand_activity', d.id] });
      toast({ title: 'Demanda atualizada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useAddDemandUpdate() {
  const qc = useQueryClient();
  const { profile, organization } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ demandId, texto, percentual }: { demandId: string; texto: string; percentual?: number | null }) => {
      if (!organization?.organization_id) throw new Error('Organização não encontrada');
      const { error } = await supabase.from('operational_demand_updates' as never).insert({
        demand_id: demandId, organization_id: organization?.organization_id,
        texto, percentual_andamento: percentual ?? null, autor: profile.id,
      } as never);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['operational_demand_updates', vars.demandId] });
      toast({ title: 'Atualização adicionada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useAddDemandComment() {
  const qc = useQueryClient();
  const { profile, organization } = useAuth();
  return useMutation({
    mutationFn: async ({ demandId, comentario }: { demandId: string; comentario: string }) => {
      if (!organization?.organization_id) throw new Error('Organização não encontrada');
      const { error } = await supabase.from('operational_demand_comments' as never).insert({
        demand_id: demandId, organization_id: organization?.organization_id, comentario, autor: profile.id,
      } as never);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['operational_demand_comments', vars.demandId] }),
  });
}

export function useOrgGestores() {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ['org_gestores', organization?.organization_id],
    enabled: !!organization?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('user_id, role, profiles:profiles!organization_members_user_id_fkey(id, full_name, avatar_url, email)')
        .eq('organization_id', organization!.organization_id!)
        .eq('is_active', true)
        .in('role', ['gestor', 'administrador', 'coordenador_operacoes', 'gerente_geral']);
      if (error) throw error;
      return ((data as any[]) ?? []).map((m) => m.profiles).filter(Boolean) as Array<{
        id: string; full_name: string | null; avatar_url: string | null; email: string;
      }>;
    },
  });
}

// ============================================================
// VÍNCULOS (CI / Requisição de Compra)
// ============================================================
export type DemandLinkType = 'ci' | 'purchase_request';

export function useDemandLinks(demandId: string | undefined) {
  return useQuery({
    queryKey: ['operational_demand_links', demandId],
    enabled: !!demandId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_demand_links' as never)
        .select('*')
        .eq('demand_id', demandId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data as unknown as any[]) ?? [];

      // hidratar com info do alvo (best-effort)
      const ciIds = rows.filter((r) => r.link_type === 'ci').map((r) => r.target_id);
      const prIds = rows.filter((r) => r.link_type === 'purchase_request').map((r) => r.target_id);
      const [cis, prs] = await Promise.all([
        ciIds.length
          ? supabase.from('ci_requests').select('id, protocol, subject, status').in('id', ciIds)
          : Promise.resolve({ data: [] as any[] }),
        prIds.length
          ? supabase.from('purchase_requests').select('id, numero, item_descricao, status').in('id', prIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const ciMap = new Map(((cis as any).data ?? []).map((c: any) => [c.id, c]));
      const prMap = new Map(((prs as any).data ?? []).map((p: any) => [p.id, p]));
      return rows.map((r) => ({
        ...r,
        target: r.link_type === 'ci' ? ciMap.get(r.target_id) : prMap.get(r.target_id),
      }));
    },
  });
}

export function useAddDemandLink() {
  const qc = useQueryClient();
  const { profile, organization } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { demandId: string; link_type: DemandLinkType; target_id: string; label?: string }) => {
      if (!organization?.organization_id) throw new Error('Organização não encontrada');
      // bloqueia duplicado
      const { data: existing } = await supabase
        .from('operational_demand_links' as never)
        .select('id')
        .eq('demand_id', input.demandId)
        .eq('link_type', input.link_type)
        .eq('target_id', input.target_id)
        .maybeSingle();
      if (existing) throw new Error('Este vínculo já existe.');

      const { error } = await supabase.from('operational_demand_links' as never).insert({
        demand_id: input.demandId,
        organization_id: organization.organization_id,
        link_type: input.link_type,
        target_id: input.target_id,
        label: input.label ?? null,
        created_by: profile.id,
      } as never);
      if (error) throw error;

      await supabase.from('operational_demand_activity_log' as never).insert({
        demand_id: input.demandId,
        organization_id: organization.organization_id,
        evento: 'vinculo',
        payload: { descricao: input.link_type === 'ci' ? 'Vinculou CI' : 'Vinculou Requisição', target_id: input.target_id },
        autor: profile.id,
      } as never);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['operational_demand_links', vars.demandId] });
      qc.invalidateQueries({ queryKey: ['operational_demand_activity', vars.demandId] });
      toast({ title: 'Vínculo adicionado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useRemoveDemandLink() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id }: { id: string; demandId: string }) => {
      const { error } = await supabase.from('operational_demand_links' as never).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['operational_demand_links', vars.demandId] });
      toast({ title: 'Vínculo removido' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useSearchCIs(term: string) {
  return useQuery({
    queryKey: ['ci_search', term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ci_requests')
        .select('id, protocol, subject, status')
        .or(`protocol.ilike.%${term}%,subject.ilike.%${term}%`)
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSearchPRs(term: string) {
  return useQuery({
    queryKey: ['pr_search', term],
    enabled: term.length >= 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('id, numero, item_descricao, status')
        .or(`numero.ilike.%${term}%,item_descricao.ilike.%${term}%`)
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ============================================================
// ANEXOS
// ============================================================
export function useUploadDemandAttachment() {
  const qc = useQueryClient();
  const { profile, organization } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ demandId, file }: { demandId: string; file: File }) => {
      if (!organization?.organization_id) throw new Error('Organização não encontrada');
      const path = `${organization.organization_id}/${demandId}/${Date.now()}_${file.name}`;
      const up = await supabase.storage.from('demand-attachments').upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const { error } = await supabase.from('operational_demand_attachments' as never).insert({
        demand_id: demandId,
        organization_id: organization.organization_id,
        file_path: path,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        uploaded_by: profile.id,
      } as never);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['operational_demand_attachments', vars.demandId] });
      toast({ title: 'Anexo enviado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteDemandAttachment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, file_path }: { id: string; file_path: string; demandId: string }) => {
      await supabase.storage.from('demand-attachments').remove([file_path]);
      const { error } = await supabase.from('operational_demand_attachments' as never).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['operational_demand_attachments', vars.demandId] });
      toast({ title: 'Anexo removido' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export async function getDemandAttachmentUrl(path: string) {
  const { data, error } = await supabase.storage.from('demand-attachments').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ============================================================
// NOTIFICAÇÕES + ATRASO AUTOMÁTICO
// ============================================================
export function useDemandNotifications() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['operational_demand_notifications', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_demand_notifications' as never)
        .select('*')
        .eq('recipient_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as unknown as any[]) ?? [];
    },
  });
}

export function useMarkOverdueDemands() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('mark_overdue_demands' as never);
      if (error) throw error;
      return data as unknown as number;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

// ============================================================
// HISTÓRICO DE STATUS + APROVAÇÃO GERENCIAL + EVOLUÇÃO RICA
// ============================================================
export interface DemandStatusHistoryEntry {
  id: string;
  demand_id: string;
  from_status: string | null;
  to_status: string;
  comment: string | null;
  changed_by: string | null;
  changed_at: string;
  author?: { id: string; full_name: string | null } | null;
}

export function useDemandStatusHistory(demandId: string | undefined) {
  return useQuery({
    queryKey: ['operational_demand_status_history', demandId],
    enabled: !!demandId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_demand_status_history' as never)
        .select('*')
        .eq('demand_id', demandId!)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      const rows = (data as unknown as DemandStatusHistoryEntry[]) ?? [];
      const ids = Array.from(new Set(rows.map((r) => r.changed_by).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
        const map = new Map(((profs as any[]) ?? []).map((p) => [p.id, p]));
        rows.forEach((r) => { if (r.changed_by) r.author = map.get(r.changed_by) ?? null; });
      }
      return rows;
    },
  });
}

/** Aprovar / rejeitar uma demanda como Gerente Geral. */
export function useDecideDemand() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      id, decision, comment,
    }: { id: string; decision: 'aprovado' | 'rejeitado'; comment: string }) => {
      const patch: any = {
        approval_state: decision,
        approval_comment: comment,
        approved_by: profile?.id ?? null,
        approved_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('operational_demands' as never)
        .update(patch as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: QK });
      qc.invalidateQueries({ queryKey: ['operational_demand', vars.id] });
      toast({
        title: vars.decision === 'aprovado' ? 'Demanda aprovada' : 'Demanda rejeitada',
      });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

/** Mudar status com comentário obrigatório (registra no histórico via trigger). */
export function useChangeDemandStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      id, status, comment, extra,
    }: { id: string; status: DemandStatus; comment: string; extra?: Record<string, any> }) => {
      const patch: any = { status, approval_comment: comment, ...(extra ?? {}) };
      if (status === 'concluida') patch.concluida_em = new Date().toISOString();
      const { error } = await supabase
        .from('operational_demands' as never)
        .update(patch as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: QK });
      qc.invalidateQueries({ queryKey: ['operational_demand', vars.id] });
      qc.invalidateQueries({ queryKey: ['operational_demand_status_history', vars.id] });
      toast({ title: 'Status atualizado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

/** Registrar evolução rica (progresso, marcos, próximos passos, pontos de atenção). */
export function useRegisterEvolution() {
  const qc = useQueryClient();
  const { profile, organization } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      demandId, texto, percentual, milestones, nextSteps, attentionPoints, newStatus,
    }: {
      demandId: string;
      texto: string;
      percentual?: number | null;
      milestones?: string[];
      nextSteps?: string;
      attentionPoints?: string;
      newStatus?: DemandStatus | null;
    }) => {
      if (!organization?.organization_id) throw new Error('Organização não encontrada');
      const fullText = [
        texto.trim(),
        milestones && milestones.length ? `\n\nMarcos concluídos:\n- ${milestones.join('\n- ')}` : '',
      ].join('');
      const { error: e1 } = await supabase.from('operational_demand_updates' as never).insert({
        demand_id: demandId,
        organization_id: organization.organization_id,
        texto: fullText,
        percentual_andamento: percentual ?? null,
        autor: profile.id,
      } as never);
      if (e1) throw e1;

      const patch: any = {};
      if (nextSteps !== undefined) patch.proximas_etapas = nextSteps;
      if (attentionPoints !== undefined) patch.attention_points = attentionPoints;
      if (newStatus) {
        patch.status = newStatus;
        if (newStatus === 'concluida') patch.concluida_em = new Date().toISOString();
      }
      if (Object.keys(patch).length) {
        const { error: e2 } = await supabase
          .from('operational_demands' as never)
          .update(patch as never)
          .eq('id', demandId);
        if (e2) throw e2;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['operational_demand_updates', vars.demandId] });
      qc.invalidateQueries({ queryKey: ['operational_demand', vars.demandId] });
      qc.invalidateQueries({ queryKey: QK });
      toast({ title: 'Evolução registrada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}


