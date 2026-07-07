export function fmtDateTime(iso?: string | null) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('pt-BR'); } catch { return iso; }
}

export function auditActionTone(action: string): 'default' | 'success' | 'warning' | 'destructive' {
  const a = action.toLowerCase();
  if (a.includes('delete') || a.includes('revoke') || a.includes('remove')) return 'destructive';
  if (a.includes('create') || a.includes('insert') || a.includes('assign')) return 'success';
  if (a.includes('update') || a.includes('change') || a.includes('reset')) return 'warning';
  return 'default';
}

export function safeJsonStringify(v: unknown): string {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

export function tryParseJson(text: string): { ok: boolean; value?: any; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, value: null };
  try { return { ok: true, value: JSON.parse(trimmed) }; }
  catch (e: any) { return { ok: false, error: e?.message ?? 'JSON inválido' }; }
}
