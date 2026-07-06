import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SupplierArchiveKind = 'quote_resolved' | 'order_done' | 'nf_sent';

export interface SupplierArchiveItem {
  id: string;
  kind: SupplierArchiveKind;
  title: string;
  subtitle?: string;
  reference?: string;
  amount?: number;
  resolvedAt: string;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export function useSupplierArchive() {
  const { supplierLink } = useAuth();
  const supplierId = supplierLink?.supplier_id;
  const since = useMemo(() => new Date(Date.now() - NINETY_DAYS_MS).toISOString(), []);

  const quotes = useQuery({
    queryKey: ['supplier_archive_quotes', supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_quotes')
        .select('id, status, valor_total, updated_at, created_at, request_id, purchase_requests:request_id(numero)')
        .eq('supplier_id', supplierId!)
        .in('status', ['escolhida', 'descartada'])
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const orders = useQuery({
    queryKey: ['supplier_archive_orders', supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, numero, status, valor_total, nota_fiscal_path, nota_fiscal_uploaded_at, updated_at, created_at')
        .eq('supplier_id', supplierId!)
        .or(`status.in.(recebido_total,cancelado),nota_fiscal_path.not.is.null`)
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const items = useMemo<SupplierArchiveItem[]>(() => {
    const arr: SupplierArchiveItem[] = [];

    (quotes.data ?? []).forEach((q: any) => {
      arr.push({
        id: `quote-${q.id}`,
        kind: 'quote_resolved',
        title: q.status === 'escolhida' ? 'Cotação escolhida' : 'Cotação descartada',
        subtitle: q.purchase_requests?.numero ? `Solicitação ${q.purchase_requests.numero}` : undefined,
        reference: q.purchase_requests?.numero ?? undefined,
        amount: q.valor_total ? Number(q.valor_total) : undefined,
        resolvedAt: q.updated_at || q.created_at,
      });
    });

    (orders.data ?? []).forEach((o: any) => {
      if (o.status === 'recebido_total' || o.status === 'cancelado') {
        arr.push({
          id: `order-${o.id}`,
          kind: 'order_done',
          title: o.status === 'recebido_total' ? 'Pedido concluído' : 'Pedido cancelado',
          reference: o.numero,
          amount: o.valor_total ? Number(o.valor_total) : undefined,
          resolvedAt: o.updated_at || o.created_at,
        });
      } else if (o.nota_fiscal_path) {
        arr.push({
          id: `nf-${o.id}`,
          kind: 'nf_sent',
          title: 'NF enviada',
          reference: o.numero,
          amount: o.valor_total ? Number(o.valor_total) : undefined,
          resolvedAt: o.nota_fiscal_uploaded_at || o.updated_at || o.created_at,
        });
      }
    });

    return arr.sort((a, b) => +new Date(b.resolvedAt) - +new Date(a.resolvedAt));
  }, [quotes.data, orders.data]);

  return {
    items,
    isLoading: quotes.isLoading || orders.isLoading,
  };
}
