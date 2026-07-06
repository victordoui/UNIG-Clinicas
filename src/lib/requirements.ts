export type RequirementStatus = 'open' | 'in_progress' | 'completed' | 'rejected';
export type RequirementPriority = 'low' | 'normal' | 'high' | 'urgent';

export const REQ_STATUS_LABEL: Record<RequirementStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em análise',
  completed: 'Concluído',
  rejected: 'Rejeitado',
};

export const REQ_STATUS_CLASS: Record<RequirementStatus, string> = {
  open: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-100 text-rose-700 border-rose-200',
};

export const REQ_PRIORITY_LABEL: Record<RequirementPriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

export const REQ_PRIORITY_CLASS: Record<RequirementPriority, string> = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-rose-100 text-rose-700 border-rose-200',
};

export function generateProtocol(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `REQ-${yy}${mm}${dd}-${rand}`;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function slaInfo(dueDate?: string | null, status?: string) {
  if (!dueDate) return { text: '—', overdue: false, done: false };
  const done = status === 'completed' || status === 'rejected';
  if (done) return { text: 'Encerrado', overdue: false, done: true };
  const due = new Date(dueDate);
  const now = new Date();
  const days = daysBetween(now, due);
  if (days < 0) return { text: `${Math.abs(days)}d em atraso`, overdue: true, done: false };
  if (days === 0) return { text: 'Vence hoje', overdue: false, done: false };
  return { text: `${days}d restantes`, overdue: false, done: false };
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
