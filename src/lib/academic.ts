export const SHIFT_LABEL: Record<string, string> = {
  matutino: 'Matutino',
  vespertino: 'Vespertino',
  noturno: 'Noturno',
  integral: 'Integral',
  ead: 'EAD',
};

export const MODALITY_LABEL: Record<string, string> = {
  presencial: 'Presencial',
  ead: 'EAD',
  hibrido: 'Híbrido',
};

export const DEGREE_LABEL: Record<string, string> = {
  graduacao: 'Graduação',
  pos_graduacao: 'Pós-graduação',
  mestrado: 'Mestrado',
  doutorado: 'Doutorado',
  tecnico: 'Técnico',
  extensao: 'Extensão',
};

export const ENROLLMENT_STATUS_LABEL: Record<string, string> = {
  ativa: 'Ativa',
  ativo: 'Ativo',
  trancada: 'Trancada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  inativa: 'Inativa',
};

export const ENTITY_STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  ativo: 'Ativo',
  inativo: 'Inativo',
};

export const DAY_LABEL_SHORT: Record<number, string> = {
  1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb', 0: 'Dom',
};

export function statusBadgeClass(status?: string) {
  const s = (status ?? '').toLowerCase();
  if (['ativa', 'ativo', 'active'].includes(s)) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (['trancada', 'inactive', 'inativa', 'inativo'].includes(s)) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (['cancelada'].includes(s)) return 'bg-rose-100 text-rose-700 border-rose-200';
  if (['concluida'].includes(s)) return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-muted text-muted-foreground border-border';
}

export interface ScheduleSlot { day: number; start: string; end: string; }

export function formatSchedule(slots: ScheduleSlot[] = []): string {
  if (!slots.length) return '—';
  return slots
    .map((s) => `${DAY_LABEL_SHORT[s.day] ?? '?'} ${s.start}-${s.end}`)
    .join(' · ');
}
