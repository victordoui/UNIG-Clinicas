export type PurchaseStatus =
  | 'nova' | 'em_analise' | 'aguardando_aprovacao' | 'aprovada' | 'reprovada'
  | 'em_cotacao' | 'compra_realizada' | 'aguardando_entrega' | 'recebida' | 'finalizada';

export type PurchasePriority = 'baixa' | 'normal' | 'alta' | 'urgente';

export const STATUS_LABEL: Record<PurchaseStatus, string> = {
  nova: 'Nova',
  em_analise: 'Em análise',
  aguardando_aprovacao: 'Aguardando aprovação',
  aprovada: 'Aprovada',
  reprovada: 'Reprovada',
  em_cotacao: 'Em cotação',
  compra_realizada: 'Compra realizada',
  aguardando_entrega: 'Aguardando entrega',
  recebida: 'Recebida',
  finalizada: 'Finalizada',
};

export const STATUS_BADGE: Record<PurchaseStatus, string> = {
  nova: 'bg-sky-500/15 text-sky-700 border-sky-500/30',
  em_analise: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  aguardando_aprovacao: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  aprovada: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  reprovada: 'bg-red-500/15 text-red-700 border-red-500/30',
  em_cotacao: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30',
  compra_realizada: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  aguardando_entrega: 'bg-violet-500/15 text-violet-700 border-violet-500/30',
  recebida: 'bg-teal-500/15 text-teal-700 border-teal-500/30',
  finalizada: 'bg-muted text-muted-foreground border-border',
};

export const PRIORITY_LABEL: Record<PurchasePriority, string> = {
  baixa: 'Baixa', normal: 'Normal', alta: 'Alta', urgente: 'Urgente',
};

export const PRIORITY_BADGE: Record<PurchasePriority, string> = {
  baixa: 'bg-muted text-muted-foreground border-border',
  normal: 'bg-sky-500/15 text-sky-700 border-sky-500/30',
  alta: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  urgente: 'bg-red-500/15 text-red-700 border-red-500/30',
};

export const formatBRL = (v: number | null | undefined) =>
  v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
