import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notifySupplierEvent } from '@/lib/notifySupplier';

export interface PurchaseReceipt {
  id: string;
  order_id: string;
  organization_id: string;
  quantidade_recebida: number;
  data_recebimento: string;
  recebido_por: string;
  observacoes: string | null;
  divergencia: boolean;
  divergencia_descricao: string | null;
  movement_id: string | null;
  created_at: string;
}

export function useReceipts(orderId?: string) {
  return useQuery({
    queryKey: ['purchase_receipts', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('purchase_receipts')
        .select('*')
        .eq('order_id', orderId)
        .order('data_recebimento', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PurchaseReceipt[];
    },
  });
}

export function useRegisterReceipt(orderId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { quantidade: number; observacoes?: string; divergencia?: boolean; divergencia_desc?: string }) => {
      if (!orderId) throw new Error('Sem pedido');
      const { data, error } = await (supabase as any).rpc('register_receipt', {
        _order_id: orderId,
        _quantidade: input.quantidade,
        _observacoes: input.observacoes ?? null,
        _divergencia: input.divergencia ?? false,
        _divergencia_desc: input.divergencia_desc ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['purchase_receipts', orderId] });
      qc.invalidateQueries({ queryKey: ['purchase_order', orderId] });
      qc.invalidateQueries({ queryKey: ['purchase_orders'] });
      toast({ title: 'Recebimento registrado' });
      if (vars.divergencia && orderId) {
        try {
          const { data: order } = await (supabase as any)
            .from('purchase_orders')
            .select('supplier_id, numero')
            .eq('id', orderId)
            .maybeSingle();
          if (order?.supplier_id) {
            notifySupplierEvent({
              event: 'divergence',
              supplier_id: order.supplier_id,
              order_id: orderId,
              reference: order.numero,
            });
          }
        } catch (e) {
          console.warn('[useRegisterReceipt] notify skipped', e);
        }
      }
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
