import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadNotificationCount } from '@/hooks/useCommunication';
import { UNIG_ROLE_LABEL, type UnigRole } from '@/lib/unigRoles';
import unigSymbol from '@/assets/unig-clinicas-symbol.png';
import unigLogo from '@/assets/unig-clinicas-logo.png';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  DollarSign,
  FileBadge,
  FileText,
  FlaskConical,
  GraduationCap,
  Home,
  Layers3,
  LayoutGrid,
  LogOut,
  Map,
  MapPinned,
  Megaphone,
  MessageSquare,
  Package,
  PawPrint,
  School,
  ScrollText,
  Settings,
  ShieldCheck,
  Stethoscope,
  Tv,
  Users,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: number;
  badgeKey?: 'notifications';
  clinicCode?: string;
  clinicCodes?: string[];
}

interface NavGroup {
  id: string;
  section: string;
  label: string;
  icon: LucideIcon;
  roles: UnigRole[];
  items: NavItem[];
}

const STAFF = ['super_admin', 'administrador', 'secretaria', 'coordenacao'] as UnigRole[];
const CLINIC_LABELS: Record<string, string> = {
  ODONTO: 'Clínica de Odontologia',
  FISIO: 'Clínica de Fisioterapia',
  VET: 'Clínica Veterinária',
  ESTETICA: 'Clínica de Estética',
};
const CLINICAL_NAVIGATION_GROUPS = new Set([
  'clinical-operations',
  'dental-clinical', 'physio-clinical', 'veterinary-clinical', 'aesthetic-clinical',
  'clinical-learning', 'clinical-management', 'clinical-support',
  'patient-portal',
  'tutor-portal',
  'administration',
]);
const sidebarScrollMemory = new globalThis.Map<string, number>();

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'clinical-operations', section: 'ATENDIMENTO', label: 'Atendimento', icon: ClipboardList,
    roles: ['super_admin', 'administrador', 'gestor_unidade', 'professor', 'coordenacao', 'atendimento', 'aluno', 'financeiro'],
    items: [
      { title: 'Painel', url: '/', icon: LayoutGrid },
      { title: 'Fila', url: '/agenda-fila?section=fila', icon: ClipboardList },
      { title: 'Agenda', url: '/agenda-fila?section=agenda', icon: CalendarDays },
      { title: 'Pacientes', url: '/pacientes', icon: Users },
      { title: 'Atendimentos', url: '/atendimentos', icon: ClipboardList },
      { title: 'Painel da TV', url: '/painel-tv', icon: Tv },
    ],
  },
  {
    id: 'dental-clinical', section: 'ODONTOLOGIA', label: 'Odontologia', icon: Stethoscope,
    roles: ['super_admin', 'administrador', 'gestor_unidade', 'professor', 'coordenacao', 'atendimento', 'aluno'],
    items: [
      { title: 'Prontuários', url: '/atendimentos', icon: FileText, clinicCode: 'ODONTO' },
      { title: 'Odontograma', url: '/especialidades?module=odontogram', icon: Stethoscope, clinicCode: 'ODONTO' },
      { title: 'Anamneses', url: '/especialidades?module=anamnesis', icon: ClipboardList, clinicCode: 'ODONTO' },
      { title: 'Planos de tratamento', url: '/especialidades?module=treatment-plans', icon: FileBadge, clinicCode: 'ODONTO' },
      { title: 'Procedimentos', url: '/procedimentos-exames?module=procedures', icon: ClipboardList, clinicCode: 'ODONTO' },
      { title: 'Evoluções', url: '/atendimentos?module=evolutions', icon: ScrollText, clinicCode: 'ODONTO' },
      { title: 'Exames e imagens', url: '/procedimentos-exames?module=exams', icon: FlaskConical, clinicCode: 'ODONTO' },
      { title: 'Documentos', url: '/documentos-consentimentos', icon: FileText, clinicCode: 'ODONTO' },
    ],
  },
  {
    id: 'physio-clinical', section: 'FISIOTERAPIA', label: 'Fisioterapia', icon: Activity,
    roles: ['super_admin', 'administrador', 'gestor_unidade', 'professor', 'coordenacao', 'atendimento', 'aluno'],
    items: [
      { title: 'Prontuários e avaliações', url: '/especialidades?module=physio-assessment', icon: FileText, clinicCode: 'FISIO' },
      { title: 'Avaliação funcional', url: '/especialidades?module=physio-functional', icon: Activity, clinicCode: 'FISIO' },
      { title: 'Planos terapêuticos', url: '/especialidades?module=physio-plans', icon: ClipboardList, clinicCode: 'FISIO' },
      { title: 'Sessões e evoluções', url: '/especialidades?module=physio-sessions', icon: ScrollText, clinicCode: 'FISIO' },
      { title: 'Reavaliações e alta', url: '/especialidades?module=physio-discharge', icon: FileBadge, clinicCode: 'FISIO' },
    ],
  },
  {
    id: 'veterinary-clinical', section: 'VETERINÁRIA', label: 'Veterinária', icon: PawPrint,
    roles: ['super_admin', 'administrador', 'gestor_unidade', 'professor', 'coordenacao', 'atendimento', 'aluno'],
    items: [
      { title: 'Tutores e animais', url: '/veterinaria', icon: PawPrint, clinicCode: 'VET' },
      { title: 'Consultas e prontuários', url: '/veterinaria?module=consultations', icon: Stethoscope, clinicCode: 'VET' },
      { title: 'Vacinas', url: '/veterinaria?module=vaccines', icon: ClipboardList, clinicCode: 'VET' },
      { title: 'Exames e prescrições', url: '/veterinaria?module=exams', icon: FlaskConical, clinicCode: 'VET' },
      { title: 'Internação', url: '/veterinaria?module=hospitalization', icon: Building2, clinicCode: 'VET' },
    ],
  },
  {
    id: 'aesthetic-clinical', section: 'ESTÉTICA', label: 'Estética', icon: Stethoscope,
    roles: ['super_admin', 'administrador', 'gestor_unidade', 'professor', 'coordenacao', 'atendimento', 'aluno'],
    items: [
      { title: 'Prontuários e anamnese', url: '/especialidades?module=aesthetic-assessment', icon: FileText, clinicCode: 'ESTETICA' },
      { title: 'Avaliação estética', url: '/especialidades?module=aesthetic-evaluation', icon: Stethoscope, clinicCode: 'ESTETICA' },
      { title: 'Protocolos e sessões', url: '/especialidades?module=aesthetic-protocols', icon: ClipboardList, clinicCode: 'ESTETICA' },
      { title: 'Registro fotográfico', url: '/especialidades?module=aesthetic-photos', icon: FileBadge, clinicCode: 'ESTETICA' },
    ],
  },
  {
    id: 'clinical-learning', section: 'ENSINO / SUPERVISÃO', label: 'Ensino e supervisão', icon: GraduationCap,
    roles: ['super_admin', 'administrador', 'gestor_unidade', 'professor', 'coordenacao', 'atendimento', 'aluno'],
    items: [
      { title: 'Supervisões', url: '/supervisoes', icon: GraduationCap },
      { title: 'Alunos', url: '/academico/alunos', icon: Users },
      { title: 'Professores', url: '/academico/professores', icon: BookOpen },
      { title: 'Pendências clínicas', url: '/supervisoes?status=pending', icon: ClipboardList },
    ],
  },
  {
    id: 'clinical-management', section: 'GESTÃO', label: 'Gestão clínica', icon: BarChart3,
    roles: ['super_admin', 'administrador', 'gestor_unidade', 'professor', 'coordenacao', 'atendimento', 'aluno', 'financeiro'],
    items: [
      { title: 'Indicadores', url: '/indicadores-clinicos', icon: BarChart3 },
      { title: 'Avaliações', url: '/supervisoes', icon: FileBadge },
      { title: 'Relatórios', url: '/relatorios/operacionais', icon: BarChart3 },
    ],
  },
  {
    id: 'clinical-support', section: 'APOIO', label: 'Apoio clínico', icon: Package,
    roles: ['super_admin', 'administrador', 'gestor_unidade', 'professor', 'coordenacao', 'atendimento', 'aluno', 'financeiro'],
    items: [
      { title: 'Materiais e insumos', url: '/admin/clinicas', icon: Package },
      { title: 'Configurações da clínica', url: '/admin/clinicas', icon: Settings },
    ],
  },
  {
    id: 'patient-portal', section: 'PORTAL', label: 'Área do Paciente', icon: Users, roles: ['paciente'],
    items: [
      { title: 'Início', url: '/portal/paciente', icon: Home },
      { title: 'Fila e agenda', url: '/agenda-fila', icon: CalendarDays },
    ],
  },
  {
    id: 'tutor-portal', section: 'PORTAL', label: 'Área do Tutor', icon: PawPrint, roles: ['tutor'],
    items: [
      { title: 'Meus animais', url: '/portal/tutor', icon: PawPrint },
      { title: 'Fila e agenda', url: '/agenda-fila', icon: CalendarDays },
    ],
  },
  {
    id: 'student', section: 'PORTAL', label: 'Área do Aluno', icon: GraduationCap, roles: ['aluno'],
    items: [
      { title: 'Minhas Disciplinas', url: '/aluno/disciplinas', icon: BookOpen },
      { title: 'Minha Grade', url: '/aluno/grade', icon: CalendarDays },
      { title: 'Notas e Frequência', url: '/aluno/notas', icon: BarChart3 },
      { title: 'Requerimentos', url: '/requerimentos', icon: FileText },
      { title: 'Financeiro', url: '/aluno/financeiro', icon: DollarSign },
      { title: 'Documentos', url: '/aluno/documentos', icon: FileBadge },
      { title: 'Comunicados', url: '/comunicados', icon: Megaphone },
    ],
  },
  {
    id: 'teacher', section: 'PORTAL', label: 'Área do Professor', icon: BookOpen, roles: ['professor'],
    items: [
      { title: 'Minhas Turmas', url: '/professor/turmas', icon: Users },
      { title: 'Grade Semanal', url: '/professor/grade', icon: CalendarDays },
      { title: 'Reservar Espaço', url: '/espacos/solicitar', icon: MapPinned },
    ],
  },
  {
    id: 'academic-overview', section: 'ACADÊMICO', label: 'Visão Acadêmica', icon: GraduationCap, roles: STAFF,
    items: [
      { title: 'Visão Geral', url: '/academico', icon: Home },
      { title: 'Calendário Acadêmico', url: '/academico/calendario', icon: CalendarDays },
    ],
  },
  {
    id: 'academic-records', section: 'ACADÊMICO', label: 'Cadastros Acadêmicos', icon: School, roles: STAFF,
    items: [
      { title: 'Alunos', url: '/academico/alunos', icon: GraduationCap },
      { title: 'Professores', url: '/academico/professores', icon: BookOpen },
      { title: 'Cursos', url: '/academico/cursos', icon: School },
      { title: 'Disciplinas', url: '/academico/disciplinas', icon: Layers3 },
      { title: 'Turmas', url: '/academico/turmas', icon: Users },
      { title: 'Grade Curricular', url: '/academico/matriz', icon: LayoutGrid },
    ],
  },
  {
    id: 'academic-schedule', section: 'ACADÊMICO', label: 'Grade e Operação', icon: CalendarDays, roles: STAFF,
    items: [
      { title: 'Grade de Aulas', url: '/academico/aulas', icon: CalendarDays },
      { title: 'Ensalamento', url: '/academico/ensalamento', icon: MapPinned },
      { title: 'Salas Livres', url: '/academico/salas-livres', icon: MapPinned },
      { title: 'Pendências', url: '/academico/pendencias', icon: ClipboardList, badge: 3 },
      { title: 'Análise de Ensalamento', url: '/academico/analise-ensalamento', icon: BarChart3 },
      { title: 'Publicação', url: '/academico/publicacao', icon: FileBadge },
      { title: 'Histórico', url: '/academico/historico', icon: ScrollText },
    ],
  },
  {
    id: 'spaces', section: 'ESPAÇOS', label: 'Espaços Acadêmicos', icon: MapPinned,
    roles: ['super_admin', 'administrador', 'operador_espacos', 'gestor_unidade', 'secretaria', 'coordenacao'],
    items: [
      { title: 'Visão Geral', url: '/espacos', icon: Home },
      { title: 'Agenda', url: '/espacos/agenda', icon: CalendarDays },
      { title: 'Salas', url: '/espacos/salas', icon: MapPinned },
      { title: 'Mapa de Espaços', url: '/espacos/mapa', icon: Map },
      { title: 'Solicitações', url: '/espacos/solicitacoes', icon: FileText },
      { title: 'Reservas', url: '/espacos/reservas', icon: CalendarDays },
      { title: 'Eventos', url: '/espacos/eventos', icon: Package },
    ],
  },
  {
    id: 'service', section: 'ATENDIMENTO', label: 'Atendimento', icon: ClipboardList,
    roles: ['super_admin', 'administrador', 'secretaria', 'atendimento'],
    items: [
      { title: 'Fila de Requerimentos', url: '/atendimento/requerimentos', icon: ClipboardList, badge: 3 },
      { title: 'Histórico do Aluno', url: '/atendimento/historico', icon: ScrollText },
    ],
  },
  {
    id: 'communication', section: 'COMUNICAÇÃO', label: 'Comunicação', icon: Megaphone,
    roles: ['super_admin', 'administrador', 'secretaria', 'gestor_unidade', 'atendimento'],
    items: [
      { title: 'Comunicados', url: '/comunicacao/comunicados', icon: Megaphone },
      { title: 'Notificações', url: '/comunicacao/notificacoes', icon: Bell, badgeKey: 'notifications' },
      { title: 'Mensagens', url: '/comunicacao/mensagens', icon: MessageSquare },
    ],
  },
  {
    id: 'finance', section: 'FINANCEIRO', label: 'Financeiro', icon: DollarSign,
    roles: ['super_admin', 'administrador', 'financeiro'],
    items: [
      { title: 'Visão Financeira', url: '/financeiro', icon: Home },
      { title: 'Mensalidades', url: '/financeiro/mensalidades', icon: DollarSign },
      { title: 'Boletos', url: '/financeiro/boletos', icon: FileText },
      { title: 'Bolsas', url: '/financeiro/bolsas', icon: GraduationCap },
      { title: 'Relatórios Financeiros', url: '/financeiro/relatorios', icon: BarChart3 },
    ],
  },
  {
    id: 'reports', section: 'ANÁLISE', label: 'Relatórios', icon: BarChart3,
    roles: ['super_admin', 'administrador', 'gestor_unidade'],
    items: [
      { title: 'Acadêmicos', url: '/relatorios/academicos', icon: GraduationCap },
      { title: 'Operacionais', url: '/relatorios/operacionais', icon: BarChart3 },
      { title: 'Ocupação de Salas', url: '/relatorios/ocupacao', icon: MapPinned },
    ],
  },
  {
    id: 'administration', section: 'SISTEMA', label: 'Administração', icon: Settings,
    roles: ['super_admin', 'administrador', 'financeiro'],
    items: [
      { title: 'Clínicas e Serviços', url: '/admin/clinicas', icon: ClipboardList },
      { title: 'Auditoria', url: '/admin/logs', icon: ScrollText },
    ],
  },
];

function matchesPath(pathname: string, url: string) {
  if (url === '/') return pathname === '/';
  if (url.split('/').filter(Boolean).length === 1) return pathname === url;
  return pathname === url || pathname.startsWith(`${url}/`);
}

export function AppSidebar() {
  const { state, setOpen, openMobile, setOpenMobile, isMobile } = useSidebar();
  const { unigRole, profile, signOut, clinicCodes } = useAuth();
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount();
  const { pathname } = useLocation();
  const collapsed = state === 'collapsed';
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollStorageKey = `uniga-sidebar-scroll:${unigRole}`;

  const visibleGroups = useMemo(
    () => NAV_GROUPS.filter((group) => CLINICAL_NAVIGATION_GROUPS.has(group.id) && group.roles.includes(unigRole)).map((group) => ({ ...group, items: group.items.filter((item) => {
      if (unigRole === 'super_admin') return true;
      if (item.clinicCode && !clinicCodes.includes(item.clinicCode)) return false;
      if (item.clinicCodes && !item.clinicCodes.some((code) => clinicCodes.includes(code))) return false;
      return true;
    }) })).filter((group) => group.items.length > 0),
    [unigRole, clinicCodes],
  );
  const activeGroup = visibleGroups.find((group) => group.items.some((item) => matchesPath(pathname, item.url)))?.id;
  const [openGroup, setOpenGroup] = useState<string | null>(() => activeGroup ?? null);

  useEffect(() => {
    if (activeGroup) setOpenGroup(activeGroup);
  }, [activeGroup]);

  useLayoutEffect(() => {
    if (isMobile && !openMobile) return;
    const content = contentRef.current;
    if (!content) return;

    const savedPosition = sidebarScrollMemory.get(scrollStorageKey) ?? Number(sessionStorage.getItem(scrollStorageKey) ?? 0);
    const frame = window.requestAnimationFrame(() => {
      content.scrollTop = Number.isFinite(savedPosition) ? savedPosition : 0;
      content.querySelector<HTMLElement>('a[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      const position = content.scrollTop;
      sidebarScrollMemory.set(scrollStorageKey, position);
      sessionStorage.setItem(scrollStorageKey, String(position));
    };
  }, [isMobile, openMobile, pathname, scrollStorageKey]);

  const rememberScrollPosition = () => {
    if (contentRef.current) {
      const position = contentRef.current.scrollTop;
      sidebarScrollMemory.set(scrollStorageKey, position);
      sessionStorage.setItem(scrollStorageKey, String(position));
    }
  };

  const activeLinkRef = useCallback((node: HTMLAnchorElement | null) => {
    if (!node) return;
    window.setTimeout(() => {
      const content = contentRef.current;
      if (!content || !node.isConnected) return;
      const contentRect = content.getBoundingClientRect();
      const activeRect = node.getBoundingClientRect();
      if (activeRect.bottom > contentRect.bottom) content.scrollTop += activeRect.bottom - contentRect.bottom + 12;
      if (activeRect.top < contentRect.top) content.scrollTop -= contentRect.top - activeRect.top + 12;
    }, 450);
  }, []);

  useLayoutEffect(() => {
    if (isMobile && !openMobile) return;
    if (!activeGroup || openGroup !== activeGroup) return;
    const timer = window.setTimeout(() => {
      const content = contentRef.current;
      const activeLink = content?.querySelector<HTMLElement>('a[aria-current="page"]');
      if (!content || !activeLink) return;
      const contentRect = content.getBoundingClientRect();
      const activeRect = activeLink.getBoundingClientRect();
      if (activeRect.bottom > contentRect.bottom) content.scrollTop += activeRect.bottom - contentRect.bottom + 12;
      if (activeRect.top < contentRect.top) content.scrollTop -= contentRect.top - activeRect.top + 12;
    }, 450);
    return () => window.clearTimeout(timer);
  }, [activeGroup, isMobile, openGroup, openMobile, pathname]);

  const name = profile?.full_name || profile?.email || 'Usuário';
  const initials = name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const clinicLabel = unigRole === 'super_admin'
    ? 'Todas as clínicas'
    : clinicCodes.length === 1
      ? (CLINIC_LABELS[clinicCodes[0]] ?? 'Clínica vinculada')
      : clinicCodes.length > 1
        ? `${clinicCodes.length} clínicas vinculadas`
        : 'Acesso institucional';
  const closeMobile = () => { if (isMobile) setOpenMobile(false); };
  const toggleGroup = (id: string) => {
    if (collapsed) {
      setOpen(true);
      setOpenGroup(id);
      return;
    }
    setOpenGroup((current) => current === id ? null : id);
  };

  let lastSection = '';

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="shrink-0 border-b border-white/10 px-3 pb-5 pt-6">
        <div className={cn('flex flex-col items-center', collapsed && 'py-0')}>
          <img
            src={collapsed ? unigSymbol : unigLogo}
            alt="UNIG Clínicas"
            className={cn('object-contain brightness-0 invert', collapsed ? 'h-10 w-10' : 'h-auto w-full max-w-[205px]')}
          />
          {!collapsed && <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-3 py-2 text-center text-xs font-semibold text-white/90"><Building2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{clinicLabel}</span></div>}
        </div>
      </SidebarHeader>

      <SidebarContent
        ref={contentRef}
        onScroll={rememberScrollPosition}
        className="sidebar-scroll-invisible gap-0 px-3 py-4"
      >
        <SidebarMenu className="mb-3">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/'}
              tooltip="Início"
              className="h-11 rounded-2xl px-3 font-bold text-white hover:bg-white/10 data-[active=true]:bg-white data-[active=true]:text-primary data-[active=true]:shadow-lg"
            >
              <NavLink to="/" onClick={() => { rememberScrollPosition(); closeMobile(); }}><Home className="h-[18px] w-[18px]" /><span>Início</span></NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {visibleGroups.map((group) => {
          const showSection = group.section !== lastSection;
          lastSection = group.section;
          const open = openGroup === group.id;
          const GroupIcon = group.icon;
          return (
            <div key={group.id} className="mb-1">
              {showSection && !collapsed && (
                <div className="mb-2 mt-4 flex items-center gap-2 px-2 first:mt-0">
                  <span className="text-[10px] font-medium tracking-[0.16em] text-white/45">{group.section}</span>
                  <span className="h-px flex-1 bg-white/[0.07]" />
                </div>
              )}

              <Collapsible open={open} onOpenChange={() => toggleGroup(group.id)}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    title={collapsed ? group.label : undefined}
                    className={cn(
                      'flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50',
                      open && !collapsed && 'bg-white/10 shadow-sm',
                      collapsed && 'justify-center px-0',
                    )}
                  >
                    <GroupIcon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <><span className="min-w-0 flex-1 truncate">{group.label}</span><ChevronDown className={cn('h-4 w-4 shrink-0 text-white/55 transition-transform', open && 'rotate-180')} /></>}
                  </button>
                </CollapsibleTrigger>

                {!collapsed && (
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <SidebarMenu className="gap-1 px-2 pb-2 pt-1">
                      {group.items.map((item) => {
                        const active = matchesPath(pathname, item.url);
                        const ItemIcon = item.icon;
                        const badge = item.badgeKey === 'notifications' ? unreadNotifications : item.badge;
                        return (
                          <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton
                              asChild
                              isActive={active}
                              tooltip={item.title}
                              className="h-10 rounded-xl px-3 text-[13px] font-semibold text-white/90 hover:bg-white/10 hover:text-white data-[active=true]:bg-white data-[active=true]:font-bold data-[active=true]:text-primary data-[active=true]:shadow-md"
                            >
                              <NavLink ref={active ? activeLinkRef : undefined} to={item.url} onClick={() => { rememberScrollPosition(); closeMobile(); }}>
                                <ItemIcon className="h-4 w-4" />
                                <span>{item.title}</span>
                              </NavLink>
                            </SidebarMenuButton>
                            {badge ? <SidebarMenuBadge className="right-2 top-2.5 h-[19px] min-w-[19px] rounded-full bg-[#ff4b55] px-1 text-[10px] font-extrabold text-white">{badge > 99 ? '99+' : badge}</SidebarMenuBadge> : null}
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </CollapsibleContent>
                )}
              </Collapsible>
            </div>
          );
        })}

      </SidebarContent>

      <SidebarFooter className="shrink-0 border-t border-white/10 p-3">
        <div className={cn('flex items-center gap-3 rounded-2xl bg-white/10 p-3 shadow-lg ring-1 ring-white/10', collapsed && 'justify-center p-2')}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-extrabold text-white">{initials}</div>
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-bold text-white">{name}</p>
              <p className="mt-1 truncate text-[11px] text-white/65">{UNIG_ROLE_LABEL[unigRole]}</p>
            </div>
          )}
          {!collapsed && (
            <button type="button" onClick={signOut} title="Sair" className="rounded-lg p-2 text-white/55 hover:bg-white/10 hover:text-white">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
