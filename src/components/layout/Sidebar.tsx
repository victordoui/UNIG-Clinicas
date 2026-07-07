import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { UnigRole } from '@/lib/unigRoles';
import unigLogo from '@/assets/uniga-logo.png';
import {
  Home, GraduationCap, BookOpen, FileText, DollarSign, FileBadge, Megaphone,
  ClipboardList, Users, School, Layers3, CalendarDays, MapPinned, Map,
  Building2, Settings, ShieldCheck, BarChart3, Bell, UserCircle, LayoutGrid,
  Package, MessageSquare, LucideIcon, ScrollText,
} from 'lucide-react';

interface Item { title: string; url: string; icon: LucideIcon; roles?: UnigRole[]; }
interface Group { label: string; items: Item[]; roles?: UnigRole[]; }

const GROUPS: Group[] = [
  {
    label: 'Portal do Aluno',
    roles: ['aluno'],
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
    label: 'Portal do Professor',
    roles: ['professor'],
    items: [
      { title: 'Minhas Turmas', url: '/professor/turmas', icon: Users },
      { title: 'Grade Semanal', url: '/professor/grade', icon: CalendarDays },
      { title: 'Reservas de Sala', url: '/espacos/solicitar', icon: MapPinned },
    ],
  },
  {
    label: 'Atendimento Acadêmico',
    roles: ['super_admin', 'administrador', 'secretaria', 'atendimento'],
    items: [
      { title: 'Fila de Requerimentos', url: '/atendimento/requerimentos', icon: ClipboardList },
      { title: 'Histórico do Aluno', url: '/atendimento/historico', icon: ScrollText },
    ],
  },
  {
    label: 'Acadêmico',
    roles: ['super_admin', 'administrador', 'secretaria', 'coordenacao'],
    items: [
      { title: 'Alunos', url: '/academico/alunos', icon: GraduationCap },
      { title: 'Professores', url: '/academico/professores', icon: BookOpen },
      { title: 'Cursos', url: '/academico/cursos', icon: School },
      { title: 'Disciplinas', url: '/academico/disciplinas', icon: Layers3 },
      { title: 'Turmas', url: '/academico/turmas', icon: Users },
      { title: 'Grade Curricular', url: '/academico/matriz', icon: LayoutGrid },
      { title: 'Grade de Aulas', url: '/academico/aulas', icon: CalendarDays },
    ],
  },
  {
    label: 'Espaços Acadêmicos',
    roles: ['super_admin', 'administrador', 'operador_espacos', 'gestor_unidade', 'secretaria', 'coordenacao'],
    items: [
      { title: 'Dashboard', url: '/espacos', icon: Home },
      { title: 'Agenda', url: '/espacos/agenda', icon: CalendarDays },
      { title: 'Salas', url: '/espacos/salas', icon: MapPinned },
      { title: 'Mapa de Salas', url: '/espacos/mapa', icon: Map },
      { title: 'Solicitações', url: '/espacos/solicitacoes', icon: FileText },
      { title: 'Reservas', url: '/espacos/reservas', icon: CalendarDays },
      { title: 'Eventos', url: '/espacos/eventos', icon: Package },
    ],
  },
  {
    label: 'Comunicação',
    roles: ['super_admin', 'administrador', 'secretaria', 'gestor_unidade', 'atendimento'],
    items: [
      { title: 'Comunicados', url: '/comunicacao/comunicados', icon: Megaphone },
      { title: 'Notificações', url: '/comunicacao/notificacoes', icon: Bell },
      { title: 'Mensagens', url: '/comunicacao/mensagens', icon: MessageSquare },
    ],
  },
  {
    label: 'Financeiro',
    roles: ['super_admin', 'administrador', 'financeiro'],
    items: [
      { title: 'Mensalidades', url: '/financeiro/mensalidades', icon: DollarSign },
      { title: 'Boletos', url: '/financeiro/boletos', icon: FileText },
      { title: 'Bolsas', url: '/financeiro/bolsas', icon: GraduationCap },
      { title: 'Relatórios', url: '/financeiro/relatorios', icon: BarChart3 },
    ],
  },
  {
    label: 'Relatórios',
    roles: ['super_admin', 'administrador', 'gestor_unidade'],
    items: [
      { title: 'Acadêmicos', url: '/relatorios/academicos', icon: BarChart3 },
      { title: 'Operacionais', url: '/relatorios/operacionais', icon: BarChart3 },
      { title: 'Ocupação de Salas', url: '/relatorios/ocupacao', icon: BarChart3 },
    ],
  },
  {
    label: 'Administração',
    roles: ['super_admin', 'administrador'],
    items: [
      { title: 'Usuários', url: '/admin/usuarios', icon: Users },
      { title: 'Permissões', url: '/admin/permissoes', icon: ShieldCheck },
      { title: 'Unidades', url: '/admin/unidades', icon: Building2 },
      { title: 'Configurações', url: '/admin/configuracoes', icon: Settings },
      { title: 'Logs do Sistema', url: '/admin/logs', icon: ScrollText },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { unigRole } = useAuth();
  const { pathname } = useLocation();
  const collapsed = state === 'collapsed';

  const roleAllowed = (rs?: UnigRole[]) => !rs || rs.length === 0 || rs.includes(unigRole);
  const visibleGroups = GROUPS.filter((g) => roleAllowed(g.roles));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <img src={unigLogo} alt="UNIG-A" className="h-8 w-8 rounded-lg object-contain shrink-0" />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm leading-none">UNIG-A</span>
              <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">Portal Acadêmico</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/'}>
                  <NavLink to="/">
                    <Home className="h-4 w-4" />
                    <span>Início</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleGroups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.filter((i) => roleAllowed(i.roles)).map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
