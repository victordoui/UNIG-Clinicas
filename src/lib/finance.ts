// Utilitários do módulo Financeiro.

export const SCHOLARSHIP_TYPE_LABEL: Record<string, string> = {
  bolsa_integral: 'Bolsa integral',
  bolsa_parcial: 'Bolsa parcial',
  desconto_pontualidade: 'Desconto pontualidade',
  desconto_convenio: 'Desconto convênio',
  outro: 'Outro',
};

export const DISCOUNT_KIND_LABEL: Record<string, string> = {
  percent: 'Percentual (%)',
  fixed: 'Valor fixo (R$)',
};

export const CHARGE_STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
  em_negociacao: 'Em negociação',
};

export const SLIP_STATUS_LABEL: Record<string, string> = {
  emitido: 'Emitido',
  pago: 'Pago',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  boleto: 'Boleto bancário',
  pix: 'PIX',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
  outro: 'Outro',
};

export function chargeStatusBadgeClass(status?: string) {
  const s = (status ?? '').toLowerCase();
  if (s === 'pago') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'pendente') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (s === 'vencido') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (s === 'em_negociacao') return 'bg-violet-100 text-violet-700 border-violet-200';
  if (s === 'cancelado') return 'bg-muted text-muted-foreground border-border';
  return 'bg-muted text-muted-foreground border-border';
}

export function slipStatusBadgeClass(status?: string) {
  const s = (status ?? '').toLowerCase();
  if (s === 'pago') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'emitido') return 'bg-sky-100 text-sky-700 border-sky-200';
  if (s === 'vencido') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (s === 'cancelado') return 'bg-muted text-muted-foreground border-border';
  return 'bg-muted text-muted-foreground border-border';
}

export function formatBRL(value?: number | string | null) {
  const n = Number(value ?? 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  return d.toLocaleDateString('pt-BR');
}

export function formatMonthRef(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/** Aplica desconto de uma bolsa sobre valor base. */
export function applyScholarship(base: number, scholarship?: { discount_kind?: string; discount_value?: number }): number {
  if (!scholarship) return 0;
  const v = Number(scholarship.discount_value ?? 0);
  if (scholarship.discount_kind === 'percent') {
    return Math.min(base, (base * v) / 100);
  }
  return Math.min(base, v);
}

/** Verifica se cobrança pendente já venceu. */
export function isOverdue(charge: { status?: string; due_date?: string }): boolean {
  if (!charge?.due_date) return false;
  if (charge.status && !['pendente', 'em_negociacao'].includes(charge.status)) return false;
  return new Date(charge.due_date + 'T23:59:59').getTime() < Date.now();
}

/** Retorna status "efetivo" considerando vencimento. */
export function effectiveChargeStatus(charge: { status?: string; due_date?: string }): string {
  if (isOverdue(charge)) return 'vencido';
  return charge.status ?? 'pendente';
}

/** Gera linha digitável mock determinística (48 dígitos formatados). */
export function generateMockDigitableLine(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const digits = String(hash).padStart(10, '0').repeat(5).slice(0, 47);
  return `${digits.slice(0, 5)}.${digits.slice(5, 10)} ${digits.slice(10, 15)}.${digits.slice(15, 21)} ${digits.slice(21, 26)}.${digits.slice(26, 32)} ${digits.slice(32, 33)} ${digits.slice(33, 47)}`;
}

export function generateSlipNumber(seed: string): string {
  const t = Date.now().toString(36).toUpperCase();
  const s = seed.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  return `BOL-${s}-${t}`;
}

/** Retorna o primeiro dia do mês para uma data (para reference_month). */
export function toMonthRef(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/** Agrega valores por status. */
export function sumByStatus<T extends { status?: string; net_amount?: number | string; amount?: number | string }>(items: T[]) {
  const acc: Record<string, number> = {};
  for (const it of items) {
    const key = it.status ?? 'pendente';
    const v = Number((it as any).net_amount ?? (it as any).amount ?? 0);
    acc[key] = (acc[key] ?? 0) + v;
  }
  return acc;
}
