/**
 * Hooks adicionais para o módulo CI: itens, cotações, pedido Alterdata, entrega.
 * Não substitui useCI.ts — adiciona funcionalidades novas sem alterar o existente.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface CIItem {
  id: string;
  ci_id: string;
  organization_id: string;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  especificacao: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface CIQuote {
  id: string;
  ci_id: string;
  organization_id: string;
  fornecedor: string;
  valor_total: number | null;
  prazo_entrega: string | null;
  condicoes_pagamento: string | null;
  anexo_url: string | null;
  escolhida: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CIPurchaseOrder {
  id: string;
  ci_id: string;
  organization_id: string;
  numero_alterdata: string | null;
  data_emissao: string | null;
  valor_total: number | null;
  status: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CIDelivery {
  id: string;
  ci_id: string;
  organization_id: string;
  data_prevista: string | null;
  data_entrega: string | null;
  recebido_por: string | null;
  conferido: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

function useCtx() {
  const { user, organization } = useAuth();
  return { userId: user?.id, orgId: organization?.organization_id };
}

// ============ ITENS ============
export function useCIItems(ciId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { userId, orgId } = useCtx();

  const list = useQuery({
    queryKey: ['ci_items', ciId],
    enabled: !!ciId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ci_items' as any).select('*').eq('ci_id', ciId!).order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CIItem[];
    },
  });

  const add = useMutation({
    mutationFn: async (input: Partial<CIItem>) => {
      if (!ciId || !orgId) throw new Error('contexto faltando');
      const { error } = await supabase.from('ci_items' as any).insert({
        ci_id: ciId,
        organization_id: orgId,
        created_by: userId,
        descricao: input.descricao ?? '',
        quantidade: input.quantidade ?? 1,
        unidade: input.unidade ?? null,
        especificacao: input.especificacao ?? null,
        observacao: input.observacao ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ci_items', ciId] }),
    onError: (e: any) => toast({ title: 'Erro ao adicionar item', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async (input: Partial<CIItem> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from('ci_items' as any).update(rest as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ci_items', ciId] }),
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ci_items' as any).delete().eq('id', id).select();
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ci_items', ciId] }),
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { ...list, add, update, remove };
}

// ============ COTAÇÕES ============
export function useCIQuotes(ciId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { userId, orgId } = useCtx();

  const list = useQuery({
    queryKey: ['ci_quotes', ciId],
    enabled: !!ciId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ci_quotes' as any).select('*').eq('ci_id', ciId!).order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CIQuote[];
    },
  });

  const add = useMutation({
    mutationFn: async (input: Partial<CIQuote>) => {
      if (!ciId || !orgId) throw new Error('contexto faltando');
      const { error } = await supabase.from('ci_quotes' as any).insert({
        ci_id: ciId,
        organization_id: orgId,
        created_by: userId,
        fornecedor: input.fornecedor ?? '',
        valor_total: input.valor_total ?? null,
        prazo_entrega: input.prazo_entrega ?? null,
        condicoes_pagamento: input.condicoes_pagamento ?? null,
        anexo_url: input.anexo_url ?? null,
        observacoes: input.observacoes ?? null,
        escolhida: false,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ci_quotes', ciId] }),
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const escolher = useMutation({
    mutationFn: async (id: string) => {
      if (!ciId) throw new Error('faltando ci');
      // Desmarca todas e marca a escolhida
      const { error: e1 } = await supabase.from('ci_quotes' as any)
        .update({ escolhida: false }).eq('ci_id', ciId);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('ci_quotes' as any)
        .update({ escolhida: true }).eq('id', id);
      if (e2) throw e2;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ci_quotes', ciId] }),
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ci_quotes' as any).delete().eq('id', id).select();
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ci_quotes', ciId] }),
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { ...list, add, escolher, remove };
}

// ============ PEDIDO ALTERDATA ============
export function useCIPurchaseOrder(ciId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { userId, orgId } = useCtx();

  const get = useQuery({
    queryKey: ['ci_po', ciId],
    enabled: !!ciId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ci_purchase_order' as any).select('*').eq('ci_id', ciId!).maybeSingle();
      if (error) throw error;
      return data as unknown as CIPurchaseOrder | null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<CIPurchaseOrder>) => {
      if (!ciId || !orgId) throw new Error('contexto faltando');
      if (get.data?.id) {
        const { error } = await supabase.from('ci_purchase_order' as any)
          .update(input as any).eq('id', get.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ci_purchase_order' as any).insert({
          ci_id: ciId,
          organization_id: orgId,
          created_by: userId,
          numero_alterdata: input.numero_alterdata ?? null,
          data_emissao: input.data_emissao ?? null,
          valor_total: input.valor_total ?? null,
          status: input.status ?? 'emitido',
          observacoes: input.observacoes ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ci_po', ciId] });
      toast({ title: 'Pedido salvo' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { ...get, upsert };
}

// ============ ENTREGA ============
export function useCIDelivery(ciId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { userId, orgId } = useCtx();

  const get = useQuery({
    queryKey: ['ci_delivery', ciId],
    enabled: !!ciId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ci_delivery' as any).select('*').eq('ci_id', ciId!).maybeSingle();
      if (error) throw error;
      return data as unknown as CIDelivery | null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<CIDelivery>) => {
      if (!ciId || !orgId) throw new Error('contexto faltando');
      if (get.data?.id) {
        const { error } = await supabase.from('ci_delivery' as any)
          .update(input as any).eq('id', get.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ci_delivery' as any).insert({
          ci_id: ciId,
          organization_id: orgId,
          created_by: userId,
          data_prevista: input.data_prevista ?? null,
          data_entrega: input.data_entrega ?? null,
          recebido_por: input.recebido_por ?? null,
          conferido: input.conferido ?? false,
          observacoes: input.observacoes ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ci_delivery', ciId] });
      toast({ title: 'Entrega salva' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { ...get, upsert };
}

// ============ Atualizar campos extras do ci_requests ============
export function useUpdateCIExtras() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (vars: {
      id: string;
      campus?: string | null;
      cost_center?: string | null;
      current_stage?: string | null;
      due_date?: string | null;
      delivery_forecast?: string | null;
      delivered_at?: string | null;
    }) => {
      const { id, ...rest } = vars;
      const { error } = await supabase.from('ci_requests' as any).update(rest as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['ci_requests'] });
      qc.invalidateQueries({ queryKey: ['ci_request', v.id] });
      toast({ title: 'Atualizado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
