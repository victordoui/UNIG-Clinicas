import type { PurchaseStatus } from '@/lib/purchaseLabels';
import type { UnigRole } from '@/lib/unigRoles';

// Linear pipeline used by the Kanban board
export const KANBAN_COLUMNS: PurchaseStatus[] = [
  'nova',
  'em_analise',
  'aguardando_aprovacao',
  'aprovada',
  'em_cotacao',
  'compra_realizada',
  'aguardando_entrega',
  'recebida',
  'finalizada',
];

// Allowed status transitions (manual moves via Kanban / detail page)
export const ALLOWED_TRANSITIONS: Record<PurchaseStatus, PurchaseStatus[]> = {
  nova: ['em_analise', 'aguardando_aprovacao'],
  em_analise: ['nova', 'aguardando_aprovacao', 'reprovada'],
  aguardando_aprovacao: [], // only via decide_approval
  aprovada: ['em_cotacao', 'compra_realizada'],
  reprovada: ['nova'],
  em_cotacao: ['compra_realizada', 'aprovada'],
  compra_realizada: ['aguardando_entrega'],
  aguardando_entrega: ['recebida'],
  recebida: ['finalizada'],
  finalizada: [],
};

const STAFF: UnigRole[] = ['super_admin', 'administrador', 'coordenador_operacoes', 'gerente_geral', 'compras'];

export function canMoveStatus(role: UnigRole, from: PurchaseStatus, to: PurchaseStatus): boolean {
  if (!STAFF.includes(role)) return false;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canDecideStep(role: UnigRole, papel: string): boolean {
  if (role === 'super_admin' || role === 'administrador' || role === 'coordenador_operacoes' || role === 'gerente_geral') return true;
  return role === papel;
}

export function canSubmitForApproval(role: UnigRole, isOwner: boolean, status: PurchaseStatus) {
  if (status !== 'nova' && status !== 'em_analise') return false;
  return isOwner || ['super_admin', 'administrador', 'coordenador_operacoes', 'gerente_geral', 'compras'].includes(role);
}
