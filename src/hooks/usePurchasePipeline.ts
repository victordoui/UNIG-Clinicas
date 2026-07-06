import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CIRequest } from '@/hooks/useCI';
import type { PurchaseRequest } from '@/hooks/usePurchaseRequests';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';
import type { PurchaseQuote } from '@/hooks/useQuotes';
import type { PurchaseReceipt } from '@/hooks/useReceipts';
import type { ApprovalStep } from '@/hooks/usePurchaseApprovals';

export type PipelineStepKey =
  | 'aberto'
  | 'analise_coord'
  | 'validacao_tecnica'
  | 'aprovacao_coord'
  | 'cotacao'
  | 'aprovacao_gerente'
  | 'conselho'
  | 'compra'
  | 'entrega'
  | 'finalizado';

export type StepState = 'done' | 'current' | 'future' | 'rejected';

export interface PipelineStep {
  key: PipelineStepKey;
  label: string;
  state: StepState;
  at?: string | null;
  responsible?: string | null;
}

export interface PipelineEvent {
  at: string;
  title: string;
  detail?: string | null;
  source: 'ci' | 'request' | 'approval' | 'order' | 'receipt';
}

export interface PipelineData {
  ci: CIRequest | null;
  request: PurchaseRequest | null;
  order: PurchaseOrder | null;
  quotes: PurchaseQuote[];
  receipts: PurchaseReceipt[];
  approvals: ApprovalStep[];
  steps: PipelineStep[];
  currentStep: PipelineStep;
  events: PipelineEvent[];
  values: { estimated: number | null; chosen: number | null; lowest: number | null; saving: number | null };
  isRejected: boolean;
}

const STEP_LABELS: Record<PipelineStepKey, string> = {
  aberto: 'Aberto',
  analise_coord: 'Análise Coordenador',
  validacao_tecnica: 'Validação Engenheira',
  aprovacao_coord: 'Aprovação Coordenador',
  cotacao: 'Cotação (3 mín.)',
  aprovacao_gerente: 'Gerente Geral',
  conselho: 'Conselho',
  compra: 'Pedido ao Fornecedor',
  entrega: 'Entrega',
  finalizado: 'Concluído',
};

const STEP_ORDER: PipelineStepKey[] = [
  'aberto', 'analise_coord', 'validacao_tecnica', 'aprovacao_coord',
  'cotacao', 'aprovacao_gerente', 'conselho',
  'compra', 'entrega', 'finalizado',
];

function deriveCurrent(
  ci: CIRequest | null,
  request: PurchaseRequest | null,
  order: PurchaseOrder | null,
  approvals: ApprovalStep[],
  quotes: PurchaseQuote[],
  receipts: PurchaseReceipt[],
): { current: PipelineStepKey; rejected: boolean } {
  const ciStatus = ci?.status as string | undefined;
  const reqStatus = request?.status;
  const orderStatus = order?.status;

  if (ciStatus === 'reprovada' || ciStatus === 'desaprovada_conselho' || reqStatus === 'reprovada' || orderStatus === 'cancelado') {
    return { current: 'aprovacao_coord', rejected: true };
  }

  if (orderStatus === 'recebido_total' || reqStatus === 'finalizada' || ciStatus === 'finalizada') {
    return { current: 'finalizado', rejected: false };
  }
  if (
    orderStatus === 'recebido_parcial' ||
    reqStatus === 'aguardando_entrega' ||
    ciStatus === 'aguardando_entrega' ||
    receipts.length > 0
  ) {
    return { current: 'entrega', rejected: false };
  }
  if (order || reqStatus === 'compra_realizada' || ciStatus === 'pedido_emitido') {
    return { current: 'compra', rejected: false };
  }
  if (ciStatus === 'aguardando_conselho') return { current: 'conselho', rejected: false };
  if (ciStatus === 'aguardando_gerente') return { current: 'aprovacao_gerente', rejected: false };

  const pendingApproval = approvals.find(a => a.status === 'pendente');
  if (pendingApproval) {
    if (pendingApproval.papel_aprovador === 'administrador') return { current: 'conselho', rejected: false };
    return { current: 'aprovacao_gerente', rejected: false };
  }

  if (reqStatus === 'em_cotacao' || ciStatus === 'em_cotacao' || quotes.length > 0) {
    return { current: 'cotacao', rejected: false };
  }
  if (ciStatus === 'aguardando_coordenador' || ciStatus === 'revisao_solicitada' || reqStatus === 'aguardando_aprovacao' || ciStatus === 'aguardando_aprovacao') {
    return { current: 'aprovacao_coord', rejected: false };
  }
  if (ciStatus === 'aguardando_validacao_tecnica' || ciStatus === 'ajuste_solicitado_engenheira') {
    return { current: 'validacao_tecnica', rejected: false };
  }
  if (reqStatus === 'em_analise' || ciStatus === 'em_analise') {
    return { current: 'analise_coord', rejected: false };
  }
  return { current: 'aberto', rejected: false };
}


export function usePurchasePipeline(input: { ciId?: string | null; requestId?: string | null; orderId?: string | null }) {
  const { ciId, requestId, orderId } = input;
  return useQuery({
    queryKey: ['purchase_pipeline', ciId ?? null, requestId ?? null, orderId ?? null],
    enabled: !!(ciId || requestId || orderId),
    queryFn: async (): Promise<PipelineData> => {
      let order: PurchaseOrder | null = null;
      let request: PurchaseRequest | null = null;
      let ci: CIRequest | null = null;

      if (orderId) {
        const { data } = await (supabase as any).from('purchase_orders').select('*').eq('id', orderId).maybeSingle();
        order = data ?? null;
      }
      const resolvedRequestId = requestId ?? order?.request_id ?? null;
      if (resolvedRequestId) {
        const { data } = await supabase.from('purchase_requests').select('*').eq('id', resolvedRequestId).maybeSingle();
        request = (data ?? null) as PurchaseRequest | null;
        if (!order) {
          const { data: ord } = await (supabase as any)
            .from('purchase_orders').select('*').eq('request_id', resolvedRequestId)
            .order('created_at', { ascending: false }).maybeSingle();
          order = ord ?? null;
        }
      }
      const resolvedCiId = ciId ?? null;
      if (resolvedCiId) {
        const { data } = await (supabase as any).from('ci_requests').select('*').eq('id', resolvedCiId).maybeSingle();
        ci = (data ?? null) as CIRequest | null;
      } else if (resolvedRequestId) {
        const { data } = await (supabase as any)
          .from('ci_requests').select('*').eq('purchase_request_id', resolvedRequestId).maybeSingle();
        ci = (data ?? null) as CIRequest | null;
      }

      const [quotesRes, receiptsRes, approvalsRes, ciHistRes, reqHistRes] = await Promise.all([
        resolvedRequestId
          ? (supabase as any).from('purchase_quotes').select('*').eq('request_id', resolvedRequestId).order('created_at')
          : Promise.resolve({ data: [] }),
        order
          ? (supabase as any).from('purchase_receipts').select('*').eq('order_id', order.id).order('data_recebimento', { ascending: false })
          : Promise.resolve({ data: [] }),
        resolvedRequestId
          ? supabase.from('purchase_request_approvals' as any).select('*').eq('request_id', resolvedRequestId).order('ordem')
          : Promise.resolve({ data: [] }),
        ci
          ? (supabase as any).from('ci_status_history').select('*').eq('ci_id', ci.id).order('created_at')
          : Promise.resolve({ data: [] }),
        resolvedRequestId
          ? supabase.from('purchase_request_history' as any).select('*').eq('request_id', resolvedRequestId).order('created_at')
          : Promise.resolve({ data: [] }),
      ]);

      const quotes = (quotesRes.data ?? []) as PurchaseQuote[];
      const receipts = (receiptsRes.data ?? []) as PurchaseReceipt[];
      const approvals = (approvalsRes.data ?? []) as unknown as ApprovalStep[];
      const ciHist = (ciHistRes.data ?? []) as any[];
      const reqHist = (reqHistRes.data ?? []) as any[];

      const { current, rejected } = deriveCurrent(ci, request, order, approvals, quotes, receipts);
      const currentIdx = STEP_ORDER.indexOf(current);
      const steps: PipelineStep[] = STEP_ORDER.map((key, idx) => ({
        key,
        label: STEP_LABELS[key],
        state: rejected && idx === currentIdx
          ? 'rejected'
          : idx < currentIdx
            ? 'done'
            : idx === currentIdx
              ? 'current'
              : 'future',
      }));

      // Evita duplicar baseline ("CI aberta" / "Solicitação criada") quando
      // já existe um evento equivalente no histórico.
      const ciHasCreated = ciHist.some((h: any) =>
        /criad|aberta|registrad/i.test(String(h?.event_type ?? '')),
      );
      const reqHasCreated = reqHist.some((h: any) =>
        /criad|aberta|registrad/i.test(String(h?.event_type ?? '')),
      );

      const baselineEvents: PipelineEvent[] = [];
      if (ci && !ciHasCreated) {
        baselineEvents.push({
          at: ci.created_at,
          source: 'ci',
          title: `CI ${ci.protocol} aberta`,
          detail: ci.requester_name ? `por ${ci.requester_name}` : null,
        });
      }
      if (request && !reqHasCreated) {
        baselineEvents.push({
          at: request.created_at,
          source: 'request',
          title: `Solicitação ${request.numero} criada`,
          detail: null,
        });
      }

      const rawEvents: PipelineEvent[] = [
        ...baselineEvents,
        ...ciHist.map((h: any): PipelineEvent => ({
          at: h.created_at, source: 'ci',
          title: `CI · ${(h.event_type || '').replace(/_/g, ' ')}`,
          detail: h.from_status && h.to_status ? `${h.from_status} → ${h.to_status}` : null,
        })),
        ...reqHist.map((h: any): PipelineEvent => ({
          at: h.created_at, source: 'request',
          title: `Solicitação · ${(h.event_type || '').replace(/_/g, ' ')}`,
          detail: h.from_status && h.to_status ? `${h.from_status} → ${h.to_status}` : null,
        })),
        ...approvals
          .filter(a => a.decidido_em)
          .map((a): PipelineEvent => ({
            at: a.decidido_em!, source: 'approval',
            title: `Aprovação ${a.papel_aprovador} · ${a.status}`,
            detail: a.comentario ?? null,
          })),
        ...(order ? [{ at: order.created_at, source: 'order' as const, title: `Pedido ${order.numero} emitido`, detail: null }] : []),
        ...receipts.map((r): PipelineEvent => ({
          at: r.data_recebimento, source: 'receipt',
          title: `Recebimento · ${Number(r.quantidade_recebida)} un.`,
          detail: r.divergencia ? `Divergência: ${r.divergencia_descricao ?? ''}` : (r.observacoes ?? null),
        })),
      ];

      // Dedupe robusto: chave por fonte + timestamp (segundo) + título + detalhe normalizados.
      const seen = new Set<string>();
      const dedup: PipelineEvent[] = [];
      for (const e of rawEvents) {
        if (!e?.at) continue;
        const ts = new Date(e.at).getTime();
        if (Number.isNaN(ts)) continue;
        const titleKey = (e.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const detailKey = (e.detail || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const key = `${e.source}|${Math.floor(ts / 1000)}|${titleKey}|${detailKey}`;
        if (seen.has(key)) continue;
        seen.add(key);
        dedup.push(e);
      }
      const events: PipelineEvent[] = dedup.sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
      );

      const lowest = quotes.length ? Math.min(...quotes.map(q => Number(q.valor_total))) : null;
      const chosen = quotes.find(q => q.status === 'escolhida');
      const chosenVal = chosen ? Number(chosen.valor_total) : null;
      const estimated = request?.valor_estimado ?? null;
      const saving = estimated != null && chosenVal != null ? estimated - chosenVal : null;

      return {
        ci, request, order, quotes, receipts, approvals,
        steps,
        currentStep: steps[currentIdx],
        events,
        values: { estimated, chosen: chosenVal, lowest, saving },
        isRejected: rejected,
      };
    },
  });
}
