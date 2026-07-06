export type PurchaseKanbanView = 'mine' | 'team' | 'unassigned';
export type PurchaseKanbanPeriod = 'all' | 'day' | 'week' | 'month';
export type PurchaseOperationalStage =
  | 'unassigned'
  | 'buyer_queue'
  | 'quoting'
  | 'decision'
  | 'ordered'
  | 'delivery'
  | 'received';

export interface PurchaseCIKanbanCard {
  id: string;
  protocol: string;
  subject: string;
  requester_name: string;
  requester_sector?: string | null;
  priority: string;
  status: string;
  assigned_to?: string | null;
  assigned_to_secondary?: string | null;
  campus?: string | null;
  cost_center_id?: string | null;
  cost_center?: string | null;
  request_type?: string | null;
  purchase_request_id?: string | null;
  created_at: string;
  updated_at?: string;
  buyer_name?: string | null;
  cost_center_name?: string | null;
  purchase_status?: string | null;
}

export interface PurchaseCIFilters {
  view: PurchaseKanbanView;
  userId?: string | null;
  search?: string;
  buyerId?: string;
  requester?: string;
  priority?: string;
  campus?: string;
  costCenterId?: string;
  requestType?: string;
  period?: PurchaseKanbanPeriod;
  stage?: PurchaseOperationalStage | 'all';
  includeClosed?: boolean;
  now?: Date;
}

export const PURCHASE_OPERATIONAL_STAGES: Array<{ value: PurchaseOperationalStage; label: string }> = [
  { value: 'unassigned', label: 'A distribuir' },
  { value: 'buyer_queue', label: 'Na fila do comprador' },
  { value: 'quoting', label: 'Em cotação' },
  { value: 'decision', label: 'Aguardando decisão' },
  { value: 'ordered', label: 'Pedido emitido' },
  { value: 'delivery', label: 'Em entrega' },
  { value: 'received', label: 'Recebida' },
];

const CLOSED_STATUSES = new Set(['finalizada', 'cancelada', 'reprovada', 'desaprovada_conselho']);
const DECISION_STATUSES = new Set([
  'aguardando_validacao_tecnica',
  'ajuste_solicitado_engenheira',
  'aguardando_validacao_regulatoria',
  'ajuste_solicitado_regulatorio',
  'aguardando_coordenador',
  'aguardando_aprovacao',
  'aguardando_gerente',
  'aguardando_conselho',
  'revisao_solicitada',
]);

export function isClosedPurchaseCI(status: string) {
  return CLOSED_STATUSES.has(status);
}

export function getPurchaseOperationalStage(ci: Pick<PurchaseCIKanbanCard, 'status' | 'assigned_to'>): PurchaseOperationalStage {
  if (ci.status === 'recebida_estoque' || isClosedPurchaseCI(ci.status)) return 'received';
  if (ci.status === 'aguardando_entrega') return 'delivery';
  if (ci.status === 'pedido_emitido') return 'ordered';
  if (ci.status === 'em_cotacao') return 'quoting';
  if (DECISION_STATUSES.has(ci.status)) return 'decision';
  if (!ci.assigned_to) return 'unassigned';
  return 'buyer_queue';
}

export function canMovePurchaseCI(
  ci: Pick<PurchaseCIKanbanCard, 'assigned_to' | 'status'>,
  from: PurchaseOperationalStage,
  to: PurchaseOperationalStage,
  userId: string | null | undefined,
  isManager: boolean,
) {
  const canOperate = isManager || (!!userId && ci.assigned_to === userId);
  if (!canOperate) return false;
  if (from === 'buyer_queue' && to === 'quoting' && ci.status === 'aprovada') return true;
  if (from === 'ordered' && to === 'delivery' && ci.status === 'pedido_emitido') return true;
  return false;
}

function isWithinPeriod(createdAt: string, period: PurchaseKanbanPeriod, now: Date) {
  if (period === 'all') return true;
  const created = new Date(createdAt);
  const cutoff = new Date(now);
  if (period === 'day') cutoff.setHours(0, 0, 0, 0);
  if (period === 'week') cutoff.setDate(cutoff.getDate() - 7);
  if (period === 'month') cutoff.setDate(cutoff.getDate() - 30);
  return created >= cutoff;
}

export function matchesPurchaseCIFilters(ci: PurchaseCIKanbanCard, filters: PurchaseCIFilters) {
  if (!filters.includeClosed && isClosedPurchaseCI(ci.status)) return false;
  if (filters.view === 'mine' && (!filters.userId || ci.assigned_to !== filters.userId)) return false;
  if (filters.view === 'unassigned' && ci.assigned_to) return false;
  if (filters.buyerId && ci.assigned_to !== filters.buyerId) return false;
  if (filters.priority && ci.priority !== filters.priority) return false;
  if (filters.campus && ci.campus !== filters.campus) return false;
  if (filters.costCenterId && ci.cost_center_id !== filters.costCenterId) return false;
  if (filters.requestType && ci.request_type !== filters.requestType) return false;
  if (filters.stage && filters.stage !== 'all' && getPurchaseOperationalStage(ci) !== filters.stage) return false;
  if (!isWithinPeriod(ci.created_at, filters.period ?? 'all', filters.now ?? new Date())) return false;

  const requester = filters.requester?.trim().toLocaleLowerCase('pt-BR');
  if (requester && !ci.requester_name.toLocaleLowerCase('pt-BR').includes(requester)) return false;

  const search = filters.search?.trim().toLocaleLowerCase('pt-BR');
  if (search) {
    const haystack = [ci.protocol, ci.subject, ci.requester_name].join(' ').toLocaleLowerCase('pt-BR');
    if (!haystack.includes(search)) return false;
  }
  return true;
}
