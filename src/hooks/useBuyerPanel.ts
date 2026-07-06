import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMyCostCenters } from '@/hooks/useUserCostCenters';
import { visibleCostCenterIds } from '@/lib/ccVisibility';
import type { CIStatus, CIPriority } from '@/lib/ciLabels';

export interface MyAssignedCIRow {
  id: string;
  protocol: string;
  subject: string;
  status: CIStatus;
  priority: CIPriority;
  updated_at: string;
  created_at: string;
}

const CI_OPEN_STATUSES: CIStatus[] = [
  'recebida','em_analise',
  'aguardando_validacao_tecnica','ajuste_solicitado_engenheira',
  'aguardando_validacao_regulatoria','ajuste_solicitado_regulatorio',
  'aguardando_coordenador','aguardando_aprovacao','aprovada','em_cotacao',
  'aguardando_gerente','aguardando_conselho','revisao_solicitada',
  'pedido_emitido','aguardando_entrega','recebida_estoque',
];

export interface ApprovedQueueRow {
  id: string;
  numero: string;
  item_descricao: string;
  quantidade: number;
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  cost_center_id: string | null;
  approved_at: string;
  days_since: number;
}

export interface OpenQuoteRow {
  request_id: string;
  request_numero: string;
  item_descricao: string;
  count: number;
  best_price: number | null;
  best_lead: number | null;
}

export interface PendingReceiptRow {
  id: string;
  numero: string;
  supplier_id: string;
  supplier_name: string;
  valor_total: number;
  quantidade: number;
  status: string;
  created_at: string;
  prazo_entrega_dias: number | null;
  due_date: string | null;
  late_days: number;
}

export interface LateSupplierRow {
  supplier_id: string;
  supplier_name: string;
  late_count: number;
  total_in_period: number;
  pct_no_prazo: number;
}

export interface BuyerKpis {
  approvedNoOrder: number;
  openQuotes: number;
  openOrders: number;
  lateOrders: number;
  openValue: number;
  myCIs: number;
}

const OPEN_ORDER_STATUSES = ['emitido', 'enviado_fornecedor', 'confirmado', 'recebido_parcial'];

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function dueDate(createdAt: string, prazo: number | null): Date | null {
  if (!prazo) return null;
  const d = new Date(createdAt);
  d.setDate(d.getDate() + prazo);
  return d;
}

export function useBuyerPanel(ccFilter: string = 'all', selectedBuyerId: string = 'team') {
  const { organization, unigRole, user } = useAuth();
  const { data: myCCs = [] } = useMyCostCenters();
  const allowedIds = visibleCostCenterIds(unigRole, myCCs);
  const orgId = organization?.organization_id;
  const userId = user?.id;
  const activeBuyerId = unigRole === 'compras' ? userId : selectedBuyerId === 'team' ? null : selectedBuyerId;

  const enabled = !!orgId;

  const approvedQueue = useQuery({
    enabled,
    queryKey: ['bp_approved_queue', orgId, allowedIds, ccFilter, activeBuyerId],
    queryFn: async (): Promise<ApprovedQueueRow[]> => {
      let q = supabase
        .from('purchase_requests')
        .select('id, numero, item_descricao, quantidade, prioridade, cost_center_id, updated_at, status')
        .eq('organization_id', orgId!)
        .eq('status', 'aprovada');
      if (allowedIds !== null) q = q.in('cost_center_id', allowedIds);
      if (ccFilter !== 'all') q = q.eq('cost_center_id', ccFilter);
      if (activeBuyerId) q = q.eq('responsavel_id', activeBuyerId);
      const { data, error } = await q;
      if (error) throw error;
      const requests = data ?? [];

      // Filter out those already with a purchase order.
      const ids = requests.map(r => r.id);
      let withOrder = new Set<string>();
      if (ids.length > 0) {
        const { data: ords } = await (supabase as any)
          .from('purchase_orders')
          .select('request_id')
          .in('request_id', ids);
        withOrder = new Set((ords ?? []).map((o: any) => o.request_id));
      }
      const now = new Date();
      const PRIO: Record<string, number> = { urgente: 0, alta: 1, normal: 2, baixa: 3 };
      return requests
        .filter(r => !withOrder.has(r.id))
        .map(r => ({
          id: r.id,
          numero: r.numero,
          item_descricao: r.item_descricao,
          quantidade: Number(r.quantidade),
          prioridade: r.prioridade as any,
          cost_center_id: r.cost_center_id,
          approved_at: r.updated_at,
          days_since: daysBetween(new Date(r.updated_at), now),
        }))
        .sort((a, b) => (PRIO[a.prioridade] - PRIO[b.prioridade]) || (b.days_since - a.days_since));
    },
  });

  const openQuotes = useQuery({
    enabled,
    queryKey: ['bp_open_quotes', orgId, allowedIds, ccFilter, activeBuyerId],
    queryFn: async (): Promise<OpenQuoteRow[]> => {
      // Quotes whose request is still 'aprovada' or 'em_cotacao' and no chosen quote yet.
      const { data: quotes, error } = await (supabase as any)
        .from('purchase_quotes')
        .select('id, request_id, valor_unitario, valor_total, prazo_entrega_dias, status')
        .eq('organization_id', orgId!);
      if (error) throw error;
      const all = quotes ?? [];
      const reqIds = Array.from(new Set(all.map((q: any) => q.request_id))) as string[];
      if (reqIds.length === 0) return [];

      let rq = supabase
        .from('purchase_requests')
        .select('id, numero, item_descricao, status, cost_center_id, responsavel_id')
        .in('id', reqIds);
      if (allowedIds !== null) rq = rq.in('cost_center_id', allowedIds);
      if (ccFilter !== 'all') rq = rq.eq('cost_center_id', ccFilter);
      if (activeBuyerId) rq = rq.eq('responsavel_id', activeBuyerId);
      const { data: reqs, error: e2 } = await rq;
      if (e2) throw e2;
      const reqMap = new Map((reqs ?? []).map((r: any) => [r.id, r]));

      // Group quotes by request, exclude requests that already have a chosen quote.
      const groups = new Map<string, any[]>();
      for (const q of all) {
        if (!reqMap.has(q.request_id)) continue;
        if (!groups.has(q.request_id)) groups.set(q.request_id, []);
        groups.get(q.request_id)!.push(q);
      }
      const rows: OpenQuoteRow[] = [];
      for (const [rid, qs] of groups.entries()) {
        if (qs.some(q => q.status === 'escolhida')) continue;
        const r: any = reqMap.get(rid);
        const prices = qs.map(q => Number(q.valor_total)).filter(v => v > 0);
        const leads = qs.map(q => Number(q.prazo_entrega_dias)).filter(v => v > 0);
        rows.push({
          request_id: rid,
          request_numero: r.numero,
          item_descricao: r.item_descricao,
          count: qs.length,
          best_price: prices.length ? Math.min(...prices) : null,
          best_lead: leads.length ? Math.min(...leads) : null,
        });
      }
      return rows.sort((a, b) => b.count - a.count);
    },
  });

  const pendingReceipts = useQuery({
    enabled,
    queryKey: ['bp_pending_receipts', orgId, activeBuyerId],
    queryFn: async (): Promise<PendingReceiptRow[]> => {
      let query = (supabase as any)
        .from('purchase_orders')
        .select('id, numero, request_id, supplier_id, valor_total, quantidade, status, created_at, prazo_entrega_dias, purchase_requests!inner(responsavel_id)')
        .eq('organization_id', orgId!)
        .in('status', OPEN_ORDER_STATUSES)
        .order('created_at', { ascending: true });
      if (activeBuyerId) query = query.eq('purchase_requests.responsavel_id', activeBuyerId);
      const { data, error } = await query;
      if (error) throw error;
      const orders = data ?? [];
      const supIds = Array.from(new Set(orders.map((o: any) => o.supplier_id))) as string[];
      let supMap = new Map<string, string>();
      if (supIds.length > 0) {
        const { data: sups } = await supabase
          .from('suppliers')
          .select('id, nome_fantasia')
          .in('id', supIds);
        supMap = new Map((sups ?? []).map(s => [s.id, s.nome_fantasia ?? '—']));
      }
      const now = new Date();
      return orders.map((o: any) => {
        const due = dueDate(o.created_at, o.prazo_entrega_dias);
        const late = due ? Math.max(0, daysBetween(due, now)) : 0;
        return {
          id: o.id,
          numero: o.numero,
          supplier_id: o.supplier_id,
          supplier_name: supMap.get(o.supplier_id) ?? '—',
          valor_total: Number(o.valor_total),
          quantidade: Number(o.quantidade),
          status: o.status,
          created_at: o.created_at,
          prazo_entrega_dias: o.prazo_entrega_dias,
          due_date: due ? due.toISOString() : null,
          late_days: late,
        };
      }).sort((a: PendingReceiptRow, b: PendingReceiptRow) => b.late_days - a.late_days);
    },
  });

  const lateSuppliers = useQuery({
    enabled,
    queryKey: ['bp_late_suppliers', orgId, activeBuyerId],
    queryFn: async (): Promise<LateSupplierRow[]> => {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      let query = (supabase as any)
        .from('purchase_orders')
        .select('id, supplier_id, status, created_at, prazo_entrega_dias, purchase_requests!inner(responsavel_id)')
        .eq('organization_id', orgId!)
        .gte('created_at', since.toISOString());
      if (activeBuyerId) query = query.eq('purchase_requests.responsavel_id', activeBuyerId);
      const { data, error } = await query;
      if (error) throw error;
      const orders = data ?? [];
      const now = new Date();

      const byS = new Map<string, { late: number; total: number; onTime: number }>();
      for (const o of orders) {
        const due = dueDate(o.created_at, o.prazo_entrega_dias);
        if (!due) continue;
        const isLate = o.status !== 'recebido_total' && now > due;
        const wasLate = o.status === 'recebido_total' && new Date(o.created_at) > due; // weak proxy
        const cur = byS.get(o.supplier_id) ?? { late: 0, total: 0, onTime: 0 };
        cur.total += 1;
        if (isLate) cur.late += 1;
        else if (!wasLate) cur.onTime += 1;
        byS.set(o.supplier_id, cur);
      }
      const supIds = Array.from(byS.keys()) as string[];
      let supMap = new Map<string, string>();
      if (supIds.length > 0) {
        const { data: sups } = await supabase
          .from('suppliers')
          .select('id, nome_fantasia')
          .in('id', supIds);
        supMap = new Map((sups ?? []).map(s => [s.id, s.nome_fantasia ?? '—']));
      }
      return Array.from(byS.entries())
        .map(([id, v]) => ({
          supplier_id: id,
          supplier_name: supMap.get(id) ?? '—',
          late_count: v.late,
          total_in_period: v.total,
          pct_no_prazo: v.total > 0 ? (v.onTime / v.total) * 100 : 0,
        }))
        .filter(r => r.late_count > 0)
        .sort((a, b) => b.late_count - a.late_count)
        .slice(0, 5);
    },
  });

  const myAssignedCIs = useQuery({
    enabled: enabled && (selectedBuyerId === 'team' || !!activeBuyerId),
    queryKey: ['bp_my_assigned_cis', orgId, activeBuyerId],
    queryFn: async (): Promise<MyAssignedCIRow[]> => {
      let query = (supabase as any)
        .from('ci_requests')
        .select('id, protocol, subject, status, priority, created_at, updated_at, assigned_to, assigned_to_secondary')
        .eq('organization_id', orgId!)
        .in('status', CI_OPEN_STATUSES)
        .order('updated_at', { ascending: false });
      if (activeBuyerId) query = query.or(`assigned_to.eq.${activeBuyerId},assigned_to_secondary.eq.${activeBuyerId}`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        protocol: r.protocol,
        subject: r.subject,
        status: r.status,
        priority: r.priority,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
    },
  });

  const kpis: BuyerKpis = {
    approvedNoOrder: approvedQueue.data?.length ?? 0,
    openQuotes: openQuotes.data?.length ?? 0,
    openOrders: pendingReceipts.data?.length ?? 0,
    lateOrders: pendingReceipts.data?.filter(o => o.late_days > 0).length ?? 0,
    openValue: pendingReceipts.data?.reduce((s, o) => s + o.valor_total, 0) ?? 0,
    myCIs: myAssignedCIs.data?.length ?? 0,
  };

  return {
    kpis,
    approvedQueue,
    openQuotes,
    pendingReceipts,
    lateSuppliers,
    myAssignedCIs,
    isLoading: approvedQueue.isLoading || openQuotes.isLoading || pendingReceipts.isLoading || lateSuppliers.isLoading,
  };
}
