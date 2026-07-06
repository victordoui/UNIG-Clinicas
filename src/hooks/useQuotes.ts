import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { notifySupplierEvent } from '@/lib/notifySupplier';



export interface PurchaseQuote {
  id: string;
  request_id: string;
  organization_id: string;
  supplier_id: string;
  valor_unitario: number;
  quantidade: number;
  valor_total: number;
  prazo_entrega_dias: number | null;
  condicao_pagamento: string | null;
  observacoes: string | null;
  anexo_path: string | null;
  status: 'recebida' | 'escolhida' | 'descartada';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useQuotes(requestId?: string) {
  return useQuery({
    queryKey: ['purchase_quotes', requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('purchase_quotes')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PurchaseQuote[];
    },
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  const { user, organization } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: Omit<Partial<PurchaseQuote>, 'id'> & { request_id: string; supplier_id: string; valor_unitario: number; quantidade: number }) => {
      if (!user || !organization) throw new Error('Sem organização');
      const payload: any = {
        ...input,
        organization_id: organization.organization_id,
        created_by: user.id,
      };
      const { data, error } = await (supabase as any).from('purchase_quotes').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['purchase_quotes', vars.request_id] });
      toast({ title: 'Cotação registrada' });
      notifySupplierEvent({
        event: 'quote_requested',
        supplier_id: vars.supplier_id,
        request_id: vars.request_id,
        amount: (vars.valor_unitario ?? 0) * (vars.quantidade ?? 0),
      });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteQuote(requestId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any).from('purchase_quotes').delete().eq('id', id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Sem permissão para excluir.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase_quotes', requestId] });
      toast({ title: 'Cotação excluída' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useChooseQuote(requestId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await (supabase as any).rpc('choose_quote', { _quote_id: quoteId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase_quotes', requestId] });
      qc.invalidateQueries({ queryKey: ['purchase_request', requestId] });
      qc.invalidateQueries({ queryKey: ['purchase_request_history', requestId] });
      qc.invalidateQueries({ queryKey: ['purchase_requests'] });
      toast({ title: 'Cotação escolhida' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { data, error } = await (supabase as any).rpc('create_purchase_order', { _quote_id: quoteId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: async (orderId) => {
      qc.invalidateQueries({ queryKey: ['purchase_orders'] });
      toast({ title: 'Pedido de compra emitido' });
      try {
        const { data: order } = await (supabase as any)
          .from('purchase_orders')
          .select('supplier_id, numero, valor_total')
          .eq('id', orderId)
          .maybeSingle();
        if (order?.supplier_id) {
          notifySupplierEvent({
            event: 'order_created',
            supplier_id: order.supplier_id,
            order_id: orderId,
            reference: order.numero,
            amount: order.valor_total,
          });
        }
      } catch (e) {
        console.warn('[useCreatePurchaseOrder] notify skipped', e);
      }
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
