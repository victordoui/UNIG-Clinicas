import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { UnigRole } from '@/lib/unigRoles';
import unigLogo from '@/assets/uniga-logo.png';
import { cn } from '@/lib/utils';
import { BarChart3, Bell, BookOpen, Building2, CalendarDays, ChevronDown, ClipboardList, DollarSign, FileBadge, FileText, GraduationCap, Home, Layers3, LayoutGrid, Map, MapPinned, Megaphone, MessageSquare, Package, School, ScrollText, Settings, ShieldCheck, Users, type LucideIcon } from 'lucide-react';

interface Item { title: string; url: string; icon: LucideIcon; roles?: UnigRole[]; }
interface Group { id: string; label: string; icon: LucideIcon; items: Item[]; roles?: UnigRole[]; }

const GROUPS: Group[] = [
  { id: 'student', label: 'Portal do Aluno', icon: GraduationCap, roles: ['aluno'], items: [
    { title: 'Minhas Disciplinas', url: '/aluno/disciplinas', icon: BookOpen }, { title: 'Minha Grade', url: '/aluno/grade', icon: CalendarDays }, { title: 'Notas e Frequência', url: '/aluno/notas', icon: BarChart3 }, { title: 'Requerimentos', url: '/requerimentos', icon: FileText }, { title: 'Financeiro', url: '/aluno/financeiro', icon: DollarSign }, { title: 'Documentos', url: '/aluno/documentos', icon: FileBadge }, { title: 'Comunicados', url: '/comunicados', icon: Megaphone },
  ] },
  { id: 'teacher', label: 'Portal do Professor', icon: BookOpen, roles: ['professor'], items: [
    { title: 'Minhas Turmas', url: '/professor/turmas', icon: Users }, { title: 'Grade Semanal', url: '/professor/grade', icon: CalendarDays }, { title: 'Reservar Espaço', url: '/espacos/solicitar', icon: MapPinned },
  ] },
  { id: 'academic-overview', label: 'Visão Acadêmica', icon: GraduationCap, roles: ['super_admin', 'administrador', 'secretaria', 'coordenacao'], items: [
    { title: 'Visão Geral', url: '/academico', icon: Home }, { title: 'Calendário Acadêmico', url: '/academico/calendario', icon: CalendarDays },
  ] },
  { id: 'academic-records', label: 'Cadastros Acadêmicos', icon: School, roles: ['super_admin', 'administrador', 'secretaria', 'coordenacao'], items: [
    { title: 'Alunos', url: '/academico/alunos', icon: GraduationCap }, { title: 'Professores', url: '/academico/professores', icon: BookOpen }, { title: 'Cursos', url: '/academico/cursos', icon: School }, { title: 'Disciplinas', url: '/academico/disciplinas', icon: Layers3 }, { title: 'Turmas', url: '/academico/turmas', icon: Users }, { title: 'Grade Curricular', url: '/academico/matriz', icon: LayoutGrid },
  ] },
  { id: 'academic-schedule', label: 'Grade e Operação', icon: CalendarDays, roles: ['super_admin', 'administrador', 'secretaria', 'coordenacao'], items: [
    { title: 'Grade de Aulas', url: '/academico/aulas', icon: CalendarDays }, { title: 'Ensalamento', url: '/academico/ensalamento', icon: MapPinned }, { title: 'Salas Livres', url: '/academico/salas-livres', icon: MapPinned }, { title: 'Pendências', url: '/academico/pendencias', icon: ClipboardList }, { title: 'Análise de Ensalamento', url: '/academico/analise-ensalamento', icon: BarChart3 }, { title: 'Publicação', url: '/academico/publicacao', icon: FileBadge }, { title: 'Histórico', url: '/academico/historico', icon: ScrollText },
  ] },
  { id: 'spaces', label: 'Espaços Acadêmicos', icon: MapPinned, roles: ['super_admin', 'administrador', 'operador_espacos', 'gestor_unidade', 'secretaria', 'coordenacao'], items: [
    { title: 'Dashboard', url: '/espacos', icon: Home }, { title: 'Agenda', url: '/espacos/agenda', icon: CalendarDays }, { title: 'Salas', url: '/espacos/salas', icon: MapPinned }, { title: 'Mapa de Espaços', url: '/espacos/mapa', icon: Map }, { title: 'Solicitações', url: '/espacos/solicitacoes', icon: FileText }, { title: 'Reservas', url: '/espacos/reservas', icon: CalendarDays }, { title: 'Eventos', url: '/espacos/eventos', icon: Package },
  ] },
  { id: 'service', label: 'Atendimento', icon: ClipboardList, roles: ['super_admin', 'administrador', 'secretaria', 'atendimento'], items: [
    { title: 'Fila de Requerimentos', url: '/atendimento/requerimentos', icon: ClipboardList }, { title: 'Histórico do Aluno', url: '/atendimento/historico', icon: ScrollText },
  ] },
  { id: 'communication', label: 'Comunicação', icon: Megaphone, roles: ['super_admin', 'administrador', 'secretaria', 'gestor_unidade', 'atendimento'], items: [
    { title: 'Comunicados', url: '/comunicacao/comunicados', icon: Megaphone }, { title: 'Notificações', url: '/comunicacao/notificacoes', icon: Bell }, { title: 'Mensagens', url: '/comunicacao/mensagens', icon: MessageSquare },
  ] },
  { id: 'finance', label: 'Financeiro', icon: DollarSign, roles: ['super_admin', 'administrador', 'financeiro'], items: [
    { title: 'Visão Financeira', url: '/financeiro', icon: Home }, { title: 'Mensalidades', url: '/financeiro/mensalidades', icon: DollarSign }, { title: 'Boletos', url: '/financeiro/boletos', icon: FileText }, { title: 'Bolsas', url: '/financeiro/bolsas', icon: GraduationCap }, { title: 'Relatórios Financeiros', url: '/financeiro/relatorios', icon: BarChart3 },
  ] },
  { id: 'reports', label: 'Relatórios', icon: BarChart3, roles: ['super_admin', 'administrador', 'gestor_unidade'], items: [
    { title: 'Acadêmicos', url: '/relatorios/academicos', icon: GraduationCap }, { title: 'Operacionais', url: '/relatorios/operacionais', icon: BarChart3 }, { title: 'Ocupação de Salas', url: '/relatorios/ocupacao', icon: MapPinned },
  ] },
  { id: 'administration', label: 'Administração', icon: Settings, roles: ['super_admin', 'administrador'], items: [
    { title: 'Usuários', url: '/admin/usuarios', icon: Users }, { title: 'Permissões', url: '/admin/permissoes', icon: ShieldCheck }, { title: 'Unidades', url: '/admin/unidades', icon: Building2 }, { title: 'Configurações', url: '/admin/configuracoes', icon: Settings }, { title: 'Logs do Sistema', url: '/admin/logs', icon: ScrollText },
  ] },
];

export function AppSidebar() {
  const { state } = useSidebar(); const { unigRole } = useAuth(); const { pathname } = useLocation(); const contentRef = useRef<HTMLDivElement>(null); const collapsed = state === 'collapsed';
  const roleAllowed = (roles?: UnigRole[]) => !roles?.length || roles.includes(unigRole);
  const visibleGroups = GROUPS.filter((group) => roleAllowed(group.roles));
  const activeGroup = visibleGroups.find((group) => group.items.some((item) => pathname === item.url))?.id;
  const [openGroups, setOpenGroups] = useState<string[]>(() => { try { return JSON.parse(sessionStorage.getItem('uniga:sidebar-groups') ?? '[]'); } catch { return []; } });
  const saveScrollPosition = () => { if (contentRef.current) sessionStorage.setItem('uniga:sidebar-scroll', String(contentRef.current.scrollTop)); };
  useLayoutEffect(() => { const saved = Number(sessionStorage.getItem('uniga:sidebar-scroll') ?? '0'); requestAnimationFrame(() => { if (contentRef.current) contentRef.current.scrollTop = saved; }); }, []);
  useEffect(() => () => saveScrollPosition(), []);
  useEffect(() => { if (activeGroup && !openGroups.includes(activeGroup)) setOpenGroups((current) => [...current, activeGroup]); }, [activeGroup, openGroups]);
  const setGroup = (id: string, open: boolean) => setOpenGroups((current) => { const next = open ? [...new Set([...current, id])] : current.filter((item) => item !== id); sessionStorage.setItem('uniga:sidebar-groups', JSON.stringify(next)); return next; });

  return <Sidebar collapsible="icon"><SidebarHeader className="border-b border-sidebar-border/70"><div className={cn('flex items-center justify-center px-2', collapsed ? 'py-2' : 'py-3')}><img src={unigLogo} alt="UNIG-A" className={cn('shrink-0 object-contain [filter:drop-shadow(0_0_1px_#fff)_drop-shadow(0_0_2px_#fff)_drop-shadow(0_1px_3px_rgba(0,0,0,0.25))]', collapsed ? 'h-10 w-10' : 'h-16 w-16')} /></div></SidebarHeader><SidebarContent ref={contentRef} onScroll={saveScrollPosition} className="gap-1 px-2 pb-5 pt-2"><SidebarGroup className="px-0 py-0"><SidebarGroupContent><SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild isActive={pathname === '/'} className="h-9 rounded-lg px-2.5"><NavLink to="/" onClick={saveScrollPosition}><Home className="h-4 w-4" /><span>Início</span></NavLink></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroupContent></SidebarGroup>{visibleGroups.map((group) => { const GroupIcon = group.icon; const active = group.id === activeGroup; const open = openGroups.includes(group.id) || active; return <Collapsible key={group.id} open={open} onOpenChange={(value) => setGroup(group.id, value)} className="group/collapsible"><SidebarGroup className="px-0 py-0.5"><SidebarGroupLabel asChild><CollapsibleTrigger className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground', active && 'text-sidebar-foreground')}><GroupIcon className="h-4 w-4" /><span className="flex-1">{group.label}</span><ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" /></CollapsibleTrigger></SidebarGroupLabel><CollapsibleContent><SidebarGroupContent><SidebarMenu className="pb-1 pt-0.5">{group.items.filter((item) => roleAllowed(item.roles)).map((item) => <SidebarMenuItem key={item.url}><SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title} className="h-9 rounded-lg px-2.5 data-[active=true]:shadow-sm"><NavLink to={item.url} onClick={saveScrollPosition}><item.icon className="h-4 w-4" /><span>{item.title}</span></NavLink></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></CollapsibleContent></SidebarGroup></Collapsible>; })}</SidebarContent></Sidebar>;
}
