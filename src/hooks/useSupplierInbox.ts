import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SupplierInboxKind = 'quote' | 'order' | 'nf' | 'divergence' | 'cadastro' | 'docs';
export type SlaTone = 'ok' | 'warn' | 'late';

export interface SupplierInboxItem {
  id: string;
  kind: SupplierInboxKind;
  title: string;
  subtitle?: string;
  reference?: string;
  amount?: number;
  createdAt: string;
  href: string;
  ageHours: number;
  slaTone: SlaTone;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

const SLA_THRESHOLDS: Record<SupplierInboxKind, { warn: number; late: number }> = {
  quote:      { warn: 24, late: 48 },
  order:      { warn: 12, late: 24 },
  nf:         { warn: 48, late: 72 },
  divergence: { warn: 24, late: 48 },
  cadastro:   { warn: 48, late: 120 },
  docs:       { warn: 72, late: 168 },
};

function computeSla(kind: SupplierInboxKind, createdAt: string): { ageHours: number; slaTone: SlaTone } {
  const ageHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 3_600_000);
  const t = SLA_THRESHOLDS[kind];
  const slaTone: SlaTone = ageHours >= t.late ? 'late' : ageHours >= t.warn ? 'warn' : 'ok';
  return { ageHours, slaTone };
}

const TONE_RANK: Record<SlaTone, number> = { late: 0, warn: 1, ok: 2 };

export function useSupplierInbox() {
  const { supplierLink } = useAuth();
  const supplierId = supplierLink?.supplier_id;

  const quotes = useQuery({
    queryKey: ['supplier_inbox_quotes', supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_quotes')
        .select('id, status, valor_total, created_at, request_id, purchase_requests:request_id(numero)')
        .eq('supplier_id', supplierId!)
        .in('status', ['solicitada', 'pendente'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const orders = useQuery({
    queryKey: ['supplier_inbox_orders', supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, numero, status, valor_total, nota_fiscal_path, created_at')
        .eq('supplier_id', supplierId!)
        .not('status', 'in', '("cancelado","recebido_total")')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const divergences = useQuery({
    queryKey: ['supplier_inbox_divergences', supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const since = new Date(Date.now() - NINETY_DAYS_MS).toISOString();
      const { data, error } = await supabase
        .from('purchase_receipts')
        .select('id, created_at, divergencia_descricao, order_id, purchase_orders:order_id(numero, supplier_id)')
        .eq('divergencia', true)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).filter((r: any) => r.purchase_orders?.supplier_id === supplierId);
    },
  });

  const supplier = useQuery({
    queryKey: ['supplier_inbox_supplier', supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, status, status_observacao, updated_at, created_at')
        .eq('id', supplierId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const docs = useQuery({
    queryKey: ['supplier_inbox_docs', supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_documents')
        .select('id, tipo, nome, status, validade, observacao_analise, updated_at, created_at')
        .eq('supplier_id', supplierId!)
        .in('status', ['reprovado', 'vencido']);
      if (error) throw error;
      return data ?? [];
    },
  });

  const invoicesRecusadas = useQuery({
    queryKey: ['supplier_inbox_invoices_recusadas', supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_invoices')
        .select('id, numero_nf, motivo_recusa, updated_at, created_at, status')
        .eq('supplier_id', supplierId!)
        .eq('status', 'recusada')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const items = useMemo<SupplierInboxItem[]>(() => {
    const arr: SupplierInboxItem[] = [];
    const push = (base: Omit<SupplierInboxItem, 'ageHours' | 'slaTone'>) => {
      arr.push({ ...base, ...computeSla(base.kind, base.createdAt) });
    };

    (quotes.data ?? []).forEach((q: any) => {
      push({
        id: `quote-${q.id}`,
        kind: 'quote',
        title: 'Cotação aguardando sua proposta',
        subtitle: q.purchase_requests?.numero ? `Solicitação ${q.purchase_requests.numero}` : 'Nova solicitação de cotação',
        reference: q.purchase_requests?.numero ?? undefined,
        amount: q.valor_total ? Number(q.valor_total) : undefined,
        createdAt: q.created_at,
        href: '/portal-fornecedor/licitacoes',
      });
    });

    (orders.data ?? []).forEach((o: any) => {
      if (o.status === 'emitido') {
        push({
          id: `order-${o.id}`,
          kind: 'order',
          title: 'Novo pedido recebido',
          subtitle: 'Confirme o recebimento e prepare a entrega',
          reference: o.numero,
          amount: o.valor_total ? Number(o.valor_total) : undefined,
          createdAt: o.created_at,
          href: `/portal-fornecedor/pedidos/${o.id}`,
        });
      }
      if (!o.nota_fiscal_path && o.status !== 'cancelado') {
        push({
          id: `nf-${o.id}`,
          kind: 'nf',
          title: 'Nota fiscal pendente',
          subtitle: 'Faça upload da NF para liberar pagamento',
          reference: o.numero,
          amount: o.valor_total ? Number(o.valor_total) : undefined,
          createdAt: o.created_at,
          href: '/portal-fornecedor/notas-fiscais',
        });
      }
    });

    (divergences.data ?? []).forEach((r: any) => {
      push({
        id: `div-${r.id}`,
        kind: 'divergence',
        title: 'Divergência no recebimento',
        subtitle: r.divergencia_descricao || 'Veja detalhes com o comprador',
        reference: r.purchase_orders?.numero ?? undefined,
        createdAt: r.created_at,
        href: '/portal-fornecedor/pedidos',
      });
    });

    const s = supplier.data;
    if (s && (s.status === 'pendente_correcao' || s.status === 'rascunho' || s.status === 'documentacao_vencida')) {
      const title =
        s.status === 'pendente_correcao' ? 'Cadastro com pendência de correção'
        : s.status === 'rascunho' ? 'Conclua seu cadastro de fornecedor'
        : 'Documentação do cadastro vencida';
      push({
        id: `cad-${s.id}`,
        kind: 'cadastro',
        title,
        subtitle: s.status_observacao ?? 'Acesse Meu cadastro para revisar',
        createdAt: s.updated_at ?? s.created_at,
        href: '/portal-fornecedor/meu-cadastro',
      });
    }

    (docs.data ?? []).forEach((d: any) => {
      push({
        id: `doc-${d.id}`,
        kind: 'docs',
        title: d.status === 'vencido' ? `Documento vencido: ${d.nome}` : `Documento reprovado: ${d.nome}`,
        subtitle: d.observacao_analise ?? 'Reenvie atualizado em Documentos',
        createdAt: d.updated_at ?? d.created_at,
        href: '/portal-fornecedor/documentos',
      });
    });

    (invoicesRecusadas.data ?? []).forEach((nf: any) => {
      push({
        id: `nfr-${nf.id}`,
        kind: 'nf',
        title: `NF recusada: ${nf.numero_nf}`,
        subtitle: nf.motivo_recusa ?? 'Reenvie corrigida em Notas fiscais',
        reference: nf.numero_nf,
        createdAt: nf.updated_at ?? nf.created_at,
        href: '/portal-fornecedor/notas-fiscais',
      });
    });

    return arr;
  }, [quotes.data, orders.data, divergences.data, supplier.data, docs.data, invoicesRecusadas.data]);

  const counts = {
    total: items.length,
    quote: items.filter((i) => i.kind === 'quote').length,
    order: items.filter((i) => i.kind === 'order').length,
    nf: items.filter((i) => i.kind === 'nf').length,
    divergence: items.filter((i) => i.kind === 'divergence').length,
    cadastro: items.filter((i) => i.kind === 'cadastro').length,
    docs: items.filter((i) => i.kind === 'docs').length,
    late: items.filter((i) => i.slaTone === 'late').length,
    warn: items.filter((i) => i.slaTone === 'warn').length,
  };

  return {
    items,
    counts,
    isLoading:
      quotes.isLoading || orders.isLoading || divergences.isLoading ||
      supplier.isLoading || docs.isLoading || invoicesRecusadas.isLoading,
  };
}

export function sortInbox(items: SupplierInboxItem[], mode: 'urgent' | 'recent'): SupplierInboxItem[] {
  const copy = [...items];
  if (mode === 'recent') {
    return copy.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  return copy.sort((a, b) => {
    const t = TONE_RANK[a.slaTone] - TONE_RANK[b.slaTone];
    if (t !== 0) return t;
    return +new Date(a.createdAt) - +new Date(b.createdAt);
  });
}
