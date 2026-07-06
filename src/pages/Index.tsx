import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { RoleDashboard, RoleQuickAction } from '@/components/dashboard/RoleDashboard';
import { RoleHomeCta, RoleHomeKpi } from '@/components/dashboard/RoleHomeCover';
import { AlunoDashboardExtras } from '@/components/aluno/AlunoDashboardExtras';
import { useStudentProfile, useStudentClasses, useStudentRequirements, useUpcomingEvents } from '@/hooks/useStudentData';
import {
  BookOpen, CalendarDays, FileText, DollarSign, FileBadge, Megaphone,
  Users, School, Layers3, MapPinned, Map, Building2, Settings, ShieldCheck,
  BarChart3, Bell, ClipboardList, ScrollText, GraduationCap, Package,
  MessageSquare, Sparkles, ShieldAlert,
} from 'lucide-react';
import type { UnigRole } from '@/lib/unigRoles';

interface RoleConfig {
  chipLabel: string;
  description: string;
  ctas: RoleHomeCta[];
  kpis: RoleHomeKpi[];
  quickActions: RoleQuickAction[];
}

function useAlunoConfig(): RoleConfig | null {
  const { data: student } = useStudentProfile();
  const { data: enrollments = [] } = useStudentClasses(student?.id);
  const { data: reqs = [] } = useStudentRequirements(student?.id);
  const { data: events = [] } = useUpcomingEvents(1);

  const openReqs = reqs.filter((r: any) => r.status === 'open' || r.status === 'in_progress').length;
  const nextEvent = events[0];
  const nextEventLabel = nextEvent ? new Date(nextEvent.starts_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—';

  return {
    chipLabel: 'Portal do Aluno',
    description: 'Acompanhe suas disciplinas, notas, financeiro e abra requerimentos em um só lugar.',
    ctas: [
      { label: 'Novo Requerimento', icon: FileText, to: '/aluno/documentos', primary: true },
      { label: 'Minha Grade', icon: CalendarDays, to: '/aluno/grade' },
    ],
    kpis: [
      { label: 'Disciplinas', value: String(enrollments.length), icon: BookOpen, tone: 'blue', to: '/aluno/disciplinas' },
      { label: 'Requerimentos', value: String(openReqs), icon: FileText, tone: 'orange', to: '/aluno/documentos' },
      { label: 'Próximo evento', value: nextEventLabel, icon: CalendarDays, tone: 'emerald' },
      { label: 'Financeiro', value: '—', icon: DollarSign, tone: 'violet', to: '/aluno/financeiro' },
    ],
    quickActions: [
      { title: 'Minhas Disciplinas', icon: BookOpen, to: '/aluno/disciplinas', tone: 'blue' },
      { title: 'Minha Grade', icon: CalendarDays, to: '/aluno/grade', tone: 'indigo' },
      { title: 'Notas e Frequência', icon: BarChart3, to: '/aluno/notas', tone: 'emerald' },
      { title: 'Documentos', icon: FileBadge, to: '/aluno/documentos', tone: 'sky' },
      { title: 'Financeiro', icon: DollarSign, to: '/aluno/financeiro', tone: 'violet' },
      { title: 'Comunicados', icon: Megaphone, to: '/comunicados', tone: 'rose' },
      { title: 'Meu Perfil', icon: Users, to: '/aluno/perfil', tone: 'teal' },
    ],
  };
}

const STATIC_CONFIGS: Record<Exclude<UnigRole, 'aluno'>, RoleConfig> = {
  professor: {
    chipLabel: 'Portal do Professor',
    description: 'Acompanhe suas turmas, disciplinas e a agenda semanal de aulas.',
    ctas: [
      { label: 'Minha Grade Semanal', icon: CalendarDays, to: '/professor/grade', primary: true },
      { label: 'Reservar Sala', icon: MapPinned, to: '/espacos/solicitar' },
    ],
    kpis: [
      { label: 'Turmas', value: '—', icon: Users, tone: 'blue', to: '/professor/turmas' },
      { label: 'Disciplinas', value: '—', icon: BookOpen, tone: 'emerald' },
      { label: 'Aulas hoje', value: '—', icon: CalendarDays, tone: 'orange' },
      { label: 'Reservas', value: '—', icon: MapPinned, tone: 'violet', to: '/espacos/solicitar' },
    ],
    quickActions: [
      { title: 'Minhas Turmas', icon: Users, to: '/professor/turmas', tone: 'blue' },
      { title: 'Grade Semanal', icon: CalendarDays, to: '/professor/grade', tone: 'indigo' },
      { title: 'Reservar Sala', icon: MapPinned, to: '/espacos/solicitar', tone: 'emerald' },
      { title: 'Comunicar Turma', icon: Megaphone, to: '/comunicacao/mensagens', tone: 'rose' },
    ],
  },
  secretaria: {
    chipLabel: 'Secretaria Acadêmica',
    description: 'Atenda requerimentos, gerencie alunos, cursos e documentos institucionais.',
    ctas: [
      { label: 'Fila de Requerimentos', icon: ClipboardList, to: '/atendimento/requerimentos', primary: true },
      { label: 'Alunos', icon: GraduationCap, to: '/academico/alunos' },
    ],
    kpis: [
      { label: 'Requerimentos', value: '—', icon: ClipboardList, tone: 'blue', to: '/atendimento/requerimentos' },
      { label: 'Alunos ativos', value: '—', icon: GraduationCap, tone: 'emerald' },
      { label: 'Novos hoje', value: '—', icon: FileText, tone: 'orange' },
      { label: 'Pendentes', value: '—', icon: FileBadge, tone: 'violet' },
    ],
    quickActions: [
      { title: 'Fila de Requerimentos', icon: ClipboardList, to: '/atendimento/requerimentos', tone: 'blue' },
      { title: 'Histórico do Aluno', icon: ScrollText, to: '/atendimento/historico', tone: 'indigo' },
      { title: 'Alunos', icon: GraduationCap, to: '/academico/alunos', tone: 'emerald' },
      { title: 'Cursos', icon: School, to: '/academico/cursos', tone: 'amber' },
      { title: 'Turmas', icon: Users, to: '/academico/turmas', tone: 'violet' },
      { title: 'Comunicados', icon: Megaphone, to: '/comunicacao/comunicados', tone: 'rose' },
    ],
  },
  coordenacao: {
    chipLabel: 'Coordenação de Curso',
    description: 'Gerencie o curso, corpo docente, disciplinas, turmas e o desempenho dos alunos.',
    ctas: [
      { label: 'Turmas do Curso', icon: Users, to: '/academico/turmas', primary: true },
      { label: 'Grade Curricular', icon: Layers3, to: '/academico/matriz' },
    ],
    kpis: [
      { label: 'Cursos', value: '—', icon: School, tone: 'blue', to: '/academico/cursos' },
      { label: 'Turmas', value: '—', icon: Users, tone: 'emerald' },
      { label: 'Docentes', value: '—', icon: BookOpen, tone: 'orange' },
      { label: 'Alunos', value: '—', icon: GraduationCap, tone: 'violet' },
    ],
    quickActions: [
      { title: 'Cursos', icon: School, to: '/academico/cursos', tone: 'blue' },
      { title: 'Disciplinas', icon: Layers3, to: '/academico/disciplinas', tone: 'indigo' },
      { title: 'Turmas', icon: Users, to: '/academico/turmas', tone: 'emerald' },
      { title: 'Grade Curricular', icon: Layers3, to: '/academico/matriz', tone: 'amber' },
      { title: 'Grade de Aulas', icon: CalendarDays, to: '/academico/aulas', tone: 'violet' },
      { title: 'Professores', icon: BookOpen, to: '/academico/professores', tone: 'sky' },
    ],
  },
  financeiro: {
    chipLabel: 'Financeiro',
    description: 'Acompanhe mensalidades, boletos, bolsas e a saúde financeira da instituição.',
    ctas: [
      { label: 'Mensalidades', icon: DollarSign, to: '/financeiro/mensalidades', primary: true },
      { label: 'Relatórios', icon: BarChart3, to: '/financeiro/relatorios' },
    ],
    kpis: [
      { label: 'A receber', value: '—', icon: DollarSign, tone: 'blue' },
      { label: 'Boletos', value: '—', icon: FileText, tone: 'emerald', to: '/financeiro/boletos' },
      { label: 'Inadimplência', value: '—', icon: BarChart3, tone: 'orange' },
      { label: 'Bolsas', value: '—', icon: GraduationCap, tone: 'violet' },
    ],
    quickActions: [
      { title: 'Mensalidades', icon: DollarSign, to: '/financeiro/mensalidades', tone: 'blue' },
      { title: 'Boletos', icon: FileText, to: '/financeiro/boletos', tone: 'indigo' },
      { title: 'Bolsas', icon: GraduationCap, to: '/financeiro/bolsas', tone: 'emerald' },
      { title: 'Relatórios Financeiros', icon: BarChart3, to: '/financeiro/relatorios', tone: 'amber' },
    ],
  },
  atendimento: {
    chipLabel: 'Atendimento',
    description: 'Atenda solicitações, requerimentos e dúvidas de alunos e docentes.',
    ctas: [
      { label: 'Fila de Atendimento', icon: ClipboardList, to: '/atendimento/requerimentos', primary: true },
      { label: 'Histórico do Aluno', icon: ScrollText, to: '/atendimento/historico' },
    ],
    kpis: [
      { label: 'Abertos', value: '—', icon: ClipboardList, tone: 'blue' },
      { label: 'Em análise', value: '—', icon: FileText, tone: 'emerald' },
      { label: 'Pendentes', value: '—', icon: FileBadge, tone: 'orange' },
      { label: 'Concluídos', value: '—', icon: BarChart3, tone: 'violet' },
    ],
    quickActions: [
      { title: 'Fila de Requerimentos', icon: ClipboardList, to: '/atendimento/requerimentos', tone: 'blue' },
      { title: 'Histórico do Aluno', icon: ScrollText, to: '/atendimento/historico', tone: 'indigo' },
      { title: 'Comunicados', icon: Megaphone, to: '/comunicacao/comunicados', tone: 'rose' },
      { title: 'Mensagens', icon: MessageSquare, to: '/comunicacao/mensagens', tone: 'emerald' },
    ],
  },
  gestor_unidade: {
    chipLabel: 'Gestor de Unidade',
    description: 'Visão consolidada da sua unidade: indicadores, ocupação, eventos e relatórios.',
    ctas: [
      { label: 'Relatórios da Unidade', icon: BarChart3, to: '/relatorios/academicos', primary: true },
      { label: 'Ocupação de Salas', icon: BarChart3, to: '/relatorios/ocupacao' },
    ],
    kpis: [
      { label: 'Alunos', value: '—', icon: GraduationCap, tone: 'blue' },
      { label: 'Cursos', value: '—', icon: School, tone: 'emerald' },
      { label: 'Reservas hoje', value: '—', icon: CalendarDays, tone: 'orange' },
      { label: 'Eventos', value: '—', icon: Package, tone: 'violet' },
    ],
    quickActions: [
      { title: 'Relatórios Acadêmicos', icon: BarChart3, to: '/relatorios/academicos', tone: 'blue' },
      { title: 'Relatórios Operacionais', icon: BarChart3, to: '/relatorios/operacionais', tone: 'indigo' },
      { title: 'Ocupação de Salas', icon: MapPinned, to: '/relatorios/ocupacao', tone: 'emerald' },
      { title: 'Eventos', icon: Package, to: '/espacos/eventos', tone: 'amber' },
      { title: 'Comunicados', icon: Megaphone, to: '/comunicacao/comunicados', tone: 'rose' },
    ],
  },
  operador_espacos: {
    chipLabel: 'Operador de Espaços',
    description: 'Gerencie salas, reservas, agenda e eventos institucionais.',
    ctas: [
      { label: 'Agenda de Salas', icon: CalendarDays, to: '/espacos/agenda', primary: true },
      { label: 'Solicitações', icon: FileText, to: '/espacos/solicitacoes' },
    ],
    kpis: [
      { label: 'Salas', value: '—', icon: MapPinned, tone: 'blue', to: '/espacos/salas' },
      { label: 'Reservas hoje', value: '—', icon: CalendarDays, tone: 'emerald' },
      { label: 'Solicitações', value: '—', icon: FileText, tone: 'orange', to: '/espacos/solicitacoes' },
      { label: 'Eventos', value: '—', icon: Package, tone: 'violet' },
    ],
    quickActions: [
      { title: 'Dashboard', icon: MapPinned, to: '/espacos', tone: 'blue' },
      { title: 'Agenda', icon: CalendarDays, to: '/espacos/agenda', tone: 'indigo' },
      { title: 'Salas', icon: MapPinned, to: '/espacos/salas', tone: 'emerald' },
      { title: 'Mapa de Salas', icon: Map, to: '/espacos/mapa', tone: 'amber' },
      { title: 'Solicitações', icon: FileText, to: '/espacos/solicitacoes', tone: 'violet' },
      { title: 'Reservas', icon: CalendarDays, to: '/espacos/reservas', tone: 'sky' },
      { title: 'Eventos', icon: Package, to: '/espacos/eventos', tone: 'rose' },
    ],
  },
  administrador: {
    chipLabel: 'Administrador',
    description: 'Gerencie usuários, permissões, unidades e configurações do sistema.',
    ctas: [
      { label: 'Usuários', icon: Users, to: '/admin/usuarios', primary: true },
      { label: 'Configurações', icon: Settings, to: '/admin/configuracoes' },
    ],
    kpis: [
      { label: 'Usuários', value: '—', icon: Users, tone: 'blue', to: '/admin/usuarios' },
      { label: 'Unidades', value: '—', icon: Building2, tone: 'emerald', to: '/admin/unidades' },
      { label: 'Alunos', value: '—', icon: GraduationCap, tone: 'orange' },
      { label: 'Requerimentos', value: '—', icon: ClipboardList, tone: 'violet' },
    ],
    quickActions: [
      { title: 'Usuários', icon: Users, to: '/admin/usuarios', tone: 'blue' },
      { title: 'Permissões', icon: ShieldCheck, to: '/admin/permissoes', tone: 'indigo' },
      { title: 'Unidades', icon: Building2, to: '/admin/unidades', tone: 'emerald' },
      { title: 'Configurações', icon: Settings, to: '/admin/configuracoes', tone: 'amber' },
      { title: 'Logs do Sistema', icon: ScrollText, to: '/admin/logs', tone: 'rose' },
      { title: 'Relatórios', icon: BarChart3, to: '/relatorios/academicos', tone: 'sky' },
    ],
  },
  super_admin: {
    chipLabel: 'Super Admin',
    description: 'Acesso total ao UNIG-A. Gerencie tudo: usuários, permissões, dados e configurações.',
    ctas: [
      { label: 'Usuários', icon: Users, to: '/admin/usuarios', primary: true },
      { label: 'Logs do Sistema', icon: ScrollText, to: '/admin/logs' },
    ],
    kpis: [
      { label: 'Usuários', value: '—', icon: Users, tone: 'blue', to: '/admin/usuarios' },
      { label: 'Unidades', value: '—', icon: Building2, tone: 'emerald' },
      { label: 'Alunos', value: '—', icon: GraduationCap, tone: 'orange' },
      { label: 'Cursos', value: '—', icon: School, tone: 'violet' },
    ],
    quickActions: [
      { title: 'Usuários', icon: Users, to: '/admin/usuarios', tone: 'blue' },
      { title: 'Permissões', icon: ShieldCheck, to: '/admin/permissoes', tone: 'indigo' },
      { title: 'Unidades', icon: Building2, to: '/admin/unidades', tone: 'emerald' },
      { title: 'Configurações', icon: Settings, to: '/admin/configuracoes', tone: 'amber' },
      { title: 'Logs do Sistema', icon: ScrollText, to: '/admin/logs', tone: 'rose' },
      { title: 'Relatórios', icon: BarChart3, to: '/relatorios/academicos', tone: 'sky' },
      { title: 'Espaços', icon: MapPinned, to: '/espacos', tone: 'violet' },
      { title: 'Financeiro', icon: DollarSign, to: '/financeiro/mensalidades', tone: 'teal' },
    ],
  },
  visitante: {
    chipLabel: 'Acesso limitado',
    description: 'Sua conta ainda não tem um papel atribuído. Entre em contato com o administrador da unidade.',
    ctas: [],
    kpis: [
      { label: 'Status', value: 'Aguardando', icon: ShieldAlert, tone: 'orange' },
      { label: 'Sistema', value: 'UNIG-A', icon: GraduationCap, tone: 'blue' },
      { label: 'Papéis', value: '10', icon: Users, tone: 'emerald' },
      { label: 'Módulos', value: '9', icon: Layers3, tone: 'violet' },
    ],
    quickActions: [
      { title: 'Comunicados', icon: Megaphone, to: '/comunicados', tone: 'rose' },
    ],
  },
};

export default function Index() {
  const { unigRole } = useAuth();
  const alunoCfg = useAlunoConfig();

  const cfg =
    unigRole === 'aluno'
      ? alunoCfg!
      : (STATIC_CONFIGS[unigRole as Exclude<UnigRole, 'aluno'>] ?? STATIC_CONFIGS.visitante);

  return (
    <MainLayout>
      <RoleDashboard chipIcon={Sparkles} {...cfg} />
      {unigRole === 'aluno' && <AlunoDashboardExtras />}
    </MainLayout>
  );
}
