export type PeriodPreset = '30d' | '90d' | 'month' | 'year' | 'custom';

export function getPeriodRange(preset: PeriodPreset, from?: string, to?: string) {
  const now = new Date();
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  if (preset === '30d') start.setDate(start.getDate() - 30);
  else if (preset === '90d') start.setDate(start.getDate() - 90);
  else if (preset === 'month') start.setDate(1);
  else if (preset === 'year') { start.setMonth(0); start.setDate(1); }
  else if (preset === 'custom') {
    return { from: from ?? start.toISOString(), to: to ?? end.toISOString() };
  }
  start.setHours(0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString() };
}

export const PERIOD_LABEL: Record<PeriodPreset, string> = {
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  month: 'Este mês',
  year: 'Este ano',
  custom: 'Personalizado',
};

export interface Filters {
  preset: PeriodPreset;
  from?: string;
  to?: string;
  courseId?: string;
  classId?: string;
  unitId?: string;
  categoryId?: string;
  status?: string;
}

export function groupCount<T>(rows: T[], keyFn: (r: T) => string | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function pct(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}

export function fmtPct(v: number, digits = 1) {
  return `${v.toFixed(digits)}%`;
}

export function fmtNum(v: number, digits = 1) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function downloadCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v == null ? '' : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(';'),
    ...rows.map(r => headers.map(h => escape(r[h])).join(';')),
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function daysBetween(a: string, b: string): number {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}
