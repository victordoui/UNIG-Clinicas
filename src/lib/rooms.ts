// Constantes e utilitários do módulo de Espaços (salas e reservas).

export const ROOM_TYPE_LABEL: Record<string, string> = {
  sala_aula: 'Sala de aula',
  laboratorio: 'Laboratório',
  auditorio: 'Auditório',
  biblioteca: 'Biblioteca',
  sala_reuniao: 'Sala de reunião',
  quadra: 'Quadra',
  sala_metodologia: 'Sala de metodologia',
  sala_especial: 'Sala especial',
  outro: 'Outro',
};

export const ROOM_STATUS_LABEL: Record<string, string> = {
  disponivel: 'Disponível',
  manutencao: 'Em manutenção',
  reservada: 'Reservada',
  inativa: 'Inativa',
};

export const RESERVATION_STATUS_LABEL: Record<string, string> = {
  solicitada: 'Solicitada',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
  cancelada: 'Cancelada',
  concluida: 'Concluída',
};

export const RESERVATION_EVENT_TYPE_LABEL: Record<string, string> = {
  reserva: 'Reserva',
  aula: 'Aula',
  evento: 'Evento',
  reuniao: 'Reunião',
  prova: 'Prova',
  manutencao: 'Manutenção',
};

export function roomStatusBadgeClass(status?: string) {
  const s = (status ?? '').toLowerCase();
  if (s === 'disponivel') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'reservada') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (s === 'manutencao') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (s === 'inativa') return 'bg-muted text-muted-foreground border-border';
  return 'bg-muted text-muted-foreground border-border';
}

export function reservationStatusBadgeClass(status?: string) {
  const s = (status ?? '').toLowerCase();
  if (s === 'aprovada') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'solicitada') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (s === 'rejeitada') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (s === 'cancelada') return 'bg-muted text-muted-foreground border-border';
  if (s === 'concluida') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-muted text-muted-foreground border-border';
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Verifica se dois intervalos se sobrepõem. */
export function overlaps(aStart: string | Date, aEnd: string | Date, bStart: string | Date, bEnd: string | Date) {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  return as < be && bs < ae;
}

/** Retorna início do dia (00:00) da segunda-feira da semana da data. */
export function startOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Dom
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Faixas horárias comuns para heatmap (07h-23h em blocos de 1h). */
export const HOUR_SLOTS = Array.from({ length: 17 }, (_, i) => i + 7); // 7..23
