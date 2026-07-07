import type { UnigRole } from './unigRoles';
import { STAFF_ROLES } from './unigRoles';

export type Audience = 'todos' | 'alunos' | 'docentes' | 'staff';
export type CommChannel = 'sistema' | 'email' | 'sms' | 'whatsapp';
export type CommPriority = 'baixa' | 'normal' | 'alta' | 'urgente';
export type CommStatus = 'rascunho' | 'agendado' | 'enviado' | 'cancelado';
export type CommTargetType = 'todos' | 'curso' | 'turma' | 'unidade' | 'usuario';

export const AUDIENCE_LABEL: Record<Audience, string> = {
  todos: 'Todos',
  alunos: 'Alunos',
  docentes: 'Docentes',
  staff: 'Equipe',
};

export const AUDIENCE_BADGE: Record<Audience, string> = {
  todos: 'bg-primary/10 text-primary border-primary/30',
  alunos: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/30',
  docentes: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  staff: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30',
};

export const PRIORITY_LABEL: Record<CommPriority, string> = {
  baixa: 'Baixa', normal: 'Normal', alta: 'Alta', urgente: 'Urgente',
};

export const PRIORITY_BADGE: Record<CommPriority, string> = {
  baixa: 'bg-muted text-muted-foreground border-border',
  normal: 'bg-sky-500/15 text-sky-700 border-sky-500/30',
  alta: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  urgente: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
};

export const CHANNEL_LABEL: Record<CommChannel, string> = {
  sistema: 'Sistema', email: 'E-mail', sms: 'SMS', whatsapp: 'WhatsApp',
};

export const STATUS_LABEL: Record<CommStatus, string> = {
  rascunho: 'Rascunho', agendado: 'Agendado', enviado: 'Enviado', cancelado: 'Cancelado',
};

export const STATUS_BADGE: Record<CommStatus, string> = {
  rascunho: 'bg-muted text-muted-foreground border-border',
  agendado: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  enviado: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  cancelado: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
};

export const TARGET_TYPE_LABEL: Record<CommTargetType, string> = {
  todos: 'Todos', curso: 'Curso', turma: 'Turma', unidade: 'Unidade', usuario: 'Usuário',
};

export const AUDIENCE_OPTIONS: Audience[] = ['todos', 'alunos', 'docentes', 'staff'];
export const PRIORITY_OPTIONS: CommPriority[] = ['baixa', 'normal', 'alta', 'urgente'];
export const CHANNEL_OPTIONS: CommChannel[] = ['sistema', 'email', 'sms', 'whatsapp'];
export const TARGET_TYPE_OPTIONS: CommTargetType[] = ['todos', 'curso', 'turma', 'unidade', 'usuario'];

export function audienceMatchesRole(audience: Audience, role: UnigRole): boolean {
  if (audience === 'todos') return true;
  if (audience === 'alunos') return role === 'aluno';
  if (audience === 'docentes') return role === 'professor';
  if (audience === 'staff') return STAFF_ROLES.includes(role);
  return false;
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'agora mesmo';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export const ANNOUNCEMENT_WRITE_ROLES: UnigRole[] = ['super_admin', 'administrador', 'coordenacao', 'secretaria'];
export const COMMUNICATION_WRITE_ROLES: UnigRole[] = ['super_admin', 'administrador', 'coordenacao', 'secretaria', 'atendimento'];

export function canWriteAnnouncement(role: UnigRole) {
  return ANNOUNCEMENT_WRITE_ROLES.includes(role);
}
export function canWriteCommunication(role: UnigRole) {
  return COMMUNICATION_WRITE_ROLES.includes(role);
}
