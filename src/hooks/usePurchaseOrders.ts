import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type PurchaseOrderStatus =
  | 'emitido' | 'enviado_fornecedor' | 'confirmado'
  | 'recebido_parcial' | 'recebido_total' | 'cancelado';

export interface PurchaseOrder {
  id: string;
  numero: string;
  request_id: string;
  quote_id: string;
  supplier_id: string;
  organization_id: string;
  valor_total: number;
  quantidade: number;
  prazo_entrega_dias: number | null;
  condicao_pagamento: string | null;
  status: PurchaseOrderStatus;
  nota_fiscal_numero: string | null;
  nota_fiscal_path: string | null;
  nota_fiscal_uploaded_at: string | null;
  emitido_por: string;
  created_at: string;
  updated_at: string;
}

export const ORDER_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  emitido: 'Emitido',
  enviado_fornecedor: 'Enviado ao fornecedor',
  confirmado: 'Confirmado',
  recebido_parcial: 'Recebido parcial',
  recebido_total: 'Recebido total',
  cancelado: 'Cancelado',
};

export const ORDER_STATUS_BADGE: Record<PurchaseOrderStatus, string> = {
  emitido: 'bg-sky-500/15 text-sky-700 border-sky-500/30',
  enviado_fornecedor: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30',
  confirmado: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  recebido_parcial: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  recebido_total: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  cancelado: 'bg-red-500/15 text-red-700 border-red-500/30',
};

export function usePurchaseOrders() {
  const { organization, isSuperAdmin } = useAuth();
  return useQuery({
    queryKey: ['purchase_orders', organization?.organization_id],
    enabled: !!organization || isSuperAdmin,
    queryFn: async () => {
      let q = (supabase as any).from('purchase_orders').select('*').order('created_at', { ascending: false });
      if (!isSuperAdmin && organization) q = q.eq('organization_id', organization.organization_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PurchaseOrder[];
    },
  });
}

export function usePurchaseOrder(id?: string) {
  return useQuery({
    queryKey: ['purchase_order', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('purchase_orders').select('*').eq('id', id).single();
      if (error) throw error;
      return data as PurchaseOrder;
    },
  });
}

export function usePurchaseOrderByRequest(requestId?: string) {
  return useQuery({
    queryKey: ['purchase_order_by_request', requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('purchase_orders').select('*').eq('request_id', requestId)
        .order('created_at', { ascending: false }).maybeSingle();
      if (error) throw error;
      return data as PurchaseOrder | null;
    },
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<PurchaseOrder> & { id: string }) => {
      const { data, error } = await (supabase as any).from('purchase_orders').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['purchase_order', vars.id] });
      qc.invalidateQueries({ queryKey: ['purchase_orders'] });
      toast({ title: 'Pedido atualizado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUploadInvoice() {
  const qc = useQueryClient();
  const { organization } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ orderId, file, numero }: { orderId: string; file: File; numero: string }) => {
      if (!organization) throw new Error('Sem organização');
      const path = `orders/${organization.organization_id}/${orderId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('purchase-attachments').upload(path, file);
      if (upErr) throw upErr;
      const { error } = await (supabase as any).from('purchase_orders').update({
        nota_fiscal_numero: numero,
        nota_fiscal_path: path,
        nota_fiscal_uploaded_at: new Date().toISOString(),
      }).eq('id', orderId);
      if (error) throw error;
      return path;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['purchase_order', vars.orderId] });
      toast({ title: 'Nota fiscal anexada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
