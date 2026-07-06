import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useInbox } from "@/hooks/useInbox";
import { useCIList, type CIRequest } from "@/hooks/useCI";
import type { LucideIcon } from "lucide-react";
import {
  Home, Package, Bell, Users, FileText, Settings, QrCode, BarChart3, Shield,
  Building2, LayoutDashboard, Truck, FileSignature, ClipboardCheck,
  Tag, Warehouse, Boxes, ArrowLeftRight, ShoppingCart, ScrollText, Inbox, Briefcase,
  ChevronDown, ChevronRight,
  AlertTriangle, PackageCheck, KanbanSquare, Plus, ListChecks, Vote,
  Trophy, Mail, ShieldCheck, Cable, FileBarChart, Send,
} from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";
import { UNIG_ROLE_LABEL } from "@/lib/unigRoles";
import vstockLogo from "@/assets/unig-facilities-logo-v2.png";

interface SidebarProps {
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  variant?: "default" | "solicitante";
}


interface MenuItem {
  title: string;
  icon: LucideIcon;
  href: string;
  description?: string;
  badge?: string;
  badgeCount?: number;
  roles?: string[];
}

interface MenuGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: MenuItem[];
  roles?: string[];
  hidden?: boolean;
  cluster?: string;
}

const STORAGE_KEY = "sidebar:groups";

// Quem pode criar/ver as próprias requisições (Solicitação de Compra)
const CAN_CREATE_CI = ["super_admin", "administrador", "solicitante"];
// Quem opera o fluxo de gestão (sem criar)
const CAN_OPERATE_CI = ["super_admin", "administrador", "gestor_aprovador", "coordenador_operacoes", "gerente_geral"];
// Quem vê o grupo Gestão de Requisições
const CAN_SEE_GESTAO = ["super_admin", "administrador", "gestor_aprovador", "coordenador_operacoes", "gerente_geral", "engenheira", "validador_regulatorio", "compras"];
const CAN_APPROVE = ["super_admin", "administrador", "gestor_aprovador", "coordenador_operacoes", "gerente_geral"];
const CAN_SEE_INBOX = ["super_admin", "administrador", "gestor_aprovador", "coordenador_operacoes", "gerente_geral", "compras", "almoxarifado", "solicitante"];
const CAN_SEE_SOLICITACAO = ["super_admin", "administrador", "solicitante"];
const CAN_SEE_DEMANDAS = ["super_admin", "administrador", "coordenador_operacoes", "gerente_geral", "gestor"];


export function Sidebar({ className, collapsed = false, variant = "default" }: SidebarProps) {
  const location = useLocation();
  const { profile, isSuperAdmin, unigRole, isCouncilMember } = useAuth();
  const { theme } = useTheme();
  const { counts: inboxCounts } = useInbox();
  const isEngineer = unigRole === 'engenheira';
  const isRegulator = unigRole === 'validador_regulatorio';
  const { data: ciAll } = useCIList();
  const techCount = (ciAll ?? []).filter((c: CIRequest) =>
    ['aguardando_validacao_tecnica', 'ajuste_solicitado_engenheira'].includes(c.status),
  ).length;
  const regCount = (ciAll ?? []).filter((c: CIRequest) =>
    ['aguardando_validacao_regulatoria', 'ajuste_solicitado_regulatorio'].includes(c.status),
  ).length;
  const validationCount = isRegulator && !isSuperAdmin
    ? regCount
    : isEngineer && !isSuperAdmin
    ? techCount
    : techCount + regCount;

  void theme;

  const solicitanteHomeItem: MenuItem = {
    title: "Início", icon: Home, href: "/unigops/ci/public", description: "Início do Solicitante",
  };
  const dashboardItem: MenuItem = {
    title: "Início", icon: Home, href: "/dashboard", description: "Painel geral e visão da operação",
  };

  const groups: MenuGroup[] = [
    {
      id: "gestao",
      title: "Gestão de Requisições",
      icon: FileSignature,
      roles: CAN_SEE_GESTAO,
      cluster: "Operação",
      items: [
        { title: "Aprovações", icon: PackageCheck, href: "/gestao-requisicoes/aprovacoes", roles: CAN_APPROVE, badgeCount: Math.max(inboxCounts.approval, inboxCounts.approvalAll ?? 0) + inboxCounts.ciApproval },
        { title: "Todas as Requisições", icon: ListChecks, href: "/gestao-requisicoes/todas", roles: CAN_OPERATE_CI },
        { title: "Kanban", icon: KanbanSquare, href: "/gestao-requisicoes/kanban", roles: CAN_OPERATE_CI },
        { title: "Validações", icon: ClipboardCheck, href: "/gestao-requisicoes/validacoes", roles: ["super_admin", "administrador", "engenheira", "validador_regulatorio"], badgeCount: isEngineer || isRegulator || isSuperAdmin ? validationCount : 0 },
      ],
    },
    {
      id: "solicitacao",
      title: "Solicitação de Compra",
      icon: Send,
      roles: CAN_SEE_SOLICITACAO,
      cluster: "Operação",
      items: [
        { title: "Nova Requisição", icon: Plus, href: "/solicitacao/nova", roles: CAN_CREATE_CI },
        { title: "Minhas Requisições", icon: ListChecks, href: "/solicitacao/minhas", roles: CAN_CREATE_CI },
      ],
    },
    {
      id: "meu-trabalho-compras",
      title: "Meu Trabalho",
      icon: Briefcase,
      roles: ["compras"],
      cluster: "Operação",
      items: [
        { title: "Painel do Comprador", icon: Briefcase, href: "/compras/painel", badgeCount: inboxCounts.myAssignedCIs },
        { title: "Minhas CIs", icon: Inbox, href: "/compras/kanban?view=mine", badgeCount: inboxCounts.myAssignedCIs },
      ],
    },
    {
      id: "compras",
      title: "Compras",
      icon: ShoppingCart,
      roles: ["super_admin", "administrador", "coordenador_operacoes", "gerente_geral", "compras", "gestor_aprovador"],
      cluster: "Operação",
      items: [
        { title: "Kanban de Compras", icon: KanbanSquare, href: "/compras/kanban" },
        { title: "Em Cotação", icon: FileSignature, href: "/compras/cotacoes" },
        { title: "Pedidos de Compra", icon: FileSignature, href: "/pedidos" },
      ],
    },
    {
      id: "fornecedores",
      title: "Fornecedores",
      icon: Truck,
      roles: ["super_admin", "administrador", "coordenador_operacoes", "gerente_geral", "compras", "gestor_aprovador"],
      cluster: "Operação",
      items: [
        { title: "Fornecedores", icon: Truck, href: "/fornecedores" },
        { title: "Desempenho de Fornecedores", icon: Trophy, href: "/fornecedores/ranking" },
        { title: "Contratos", icon: FileSignature, href: "/contratos" },
      ],
    },
    {
      id: "almoxarifado",
      title: "Almoxarifado",
      icon: Warehouse,
      roles: ["super_admin", "administrador", "coordenador_operacoes", "gerente_geral", "almoxarifado", "gestor_aprovador", "visualizador"],
      cluster: "Logística",
      items: [
        { title: "Produtos", icon: Package, href: "/produtos" },
        { title: "Movimentações", icon: ArrowLeftRight, href: "/movimentacoes" },
        { title: "Transferências", icon: ArrowLeftRight, href: "/transferencias", roles: ["super_admin", "administrador", "coordenador_operacoes", "gerente_geral", "almoxarifado"] },
        { title: "Scanner QR Code", icon: QrCode, href: "/scanner", roles: ["super_admin", "administrador", "coordenador_operacoes", "gerente_geral", "almoxarifado"] },
        { title: "Locais", icon: Warehouse, href: "/locais", roles: ["super_admin", "administrador", "coordenador_operacoes", "gerente_geral", "almoxarifado"] },
        { title: "Lotes", icon: Boxes, href: "/lotes", roles: ["super_admin", "administrador", "coordenador_operacoes", "gerente_geral", "almoxarifado"] },
        { title: "Inventário", icon: ClipboardCheck, href: "/inventario", roles: ["super_admin", "administrador", "coordenador_operacoes", "gerente_geral", "almoxarifado"] },
        { title: "Etiquetas", icon: Tag, href: "/etiquetas", roles: ["super_admin", "administrador", "coordenador_operacoes", "gerente_geral", "almoxarifado"] },
        { title: "Contagem Cíclica", icon: ClipboardCheck, href: "/contagem-ciclica", roles: ["super_admin", "administrador", "coordenador_operacoes", "gerente_geral", "almoxarifado"] },
        { title: "Separação por Ondas", icon: Truck, href: "/separacao-ondas", roles: ["super_admin", "administrador", "coordenador_operacoes", "gerente_geral", "almoxarifado"] },
      ],
    },
    {
      id: "recebimentos",
      title: "Recebimentos",
      icon: PackageCheck,
      roles: ["super_admin", "administrador", "coordenador_operacoes", "gerente_geral", "compras", "almoxarifado"],
      cluster: "Logística",
      items: [
        { title: "Conferência de Entrega", icon: ClipboardCheck, href: "/recebimentos/conferencia" },
        { title: "Divergências", icon: AlertTriangle, href: "/recebimentos/divergencias" },
        { title: "Recebimento Fiscal", icon: ScrollText, href: "/recebimento-fiscal" },
      ],
    },
    {
      id: "relatorios",
      title: "Relatórios",
      icon: BarChart3,
      roles: ["super_admin", "administrador", "coordenador_operacoes", "gerente_geral", "gestor_aprovador", "visualizador"],
      cluster: "Análise",
      items: [
        { title: "Relatórios de Estoque", icon: BarChart3, href: "/relatorios" },
        { title: "Relatórios de Compras", icon: BarChart3, href: "/relatorios/compras" },
        { title: "Dashboard Executivo", icon: LayoutDashboard, href: "/executivo" },
        { title: "Relatórios Salvos", icon: FileText, href: "/relatorios/salvos" },
        { title: "BI Avançado", icon: BarChart3, href: "/bi-avancado" },
        { title: "Exportações Contábeis", icon: FileText, href: "/exportacoes-contabeis" },
      ],
    },
    {
      id: "conselho",
      title: "Conselho",
      icon: Vote,
      cluster: "Análise",
      hidden: !(
        isCouncilMember ||
        isSuperAdmin ||
        unigRole === 'administrador' ||
        unigRole === 'gerente_geral' ||
        unigRole === 'conselho'
      ),
      items: [
        { title: "Dashboard Conselho", icon: BarChart3, href: "/conselho/dashboard" },
        { title: "Propostas", icon: ListChecks, href: "/conselho", badgeCount: (isCouncilMember || isSuperAdmin || unigRole === 'administrador' || unigRole === 'gerente_geral' || unigRole === 'conselho') ? inboxCounts.council : 0 },
        { title: "Pendências", icon: Inbox, href: "/conselho/pendencias", badgeCount: (isCouncilMember || isSuperAdmin || unigRole === 'administrador' || unigRole === 'gerente_geral' || unigRole === 'conselho') ? inboxCounts.council : 0 },
        { title: "Nova Proposta", icon: Plus, href: "/conselho/nova", roles: ["super_admin", "administrador", "gerente_geral", "compras"] },
      ],
    },
    {
      id: "demandas",
      title: "Atualizações Gerenciais",
      icon: Briefcase,
      roles: CAN_SEE_DEMANDAS,
      cluster: "Operação",
      items: [
        { title: "Painel Gerencial", icon: LayoutDashboard, href: "/demandas" },
        { title: "Nova Atualização", icon: Plus, href: "/demandas/nova" },
        { title: "Demandas em Andamento", icon: ListChecks, href: "/demandas/lista" },
        { title: "Histórico por Unidade", icon: Building2, href: "/demandas/historico-unidade" },
        { title: "Relatório Mensal", icon: FileBarChart, href: "/demandas/relatorio-mensal" },
      ],
    },
    {
      id: "patrimonio",
      title: "Patrimônio",
      icon: Package,
      roles: ["super_admin", "administrador", "coordenador_operacoes", "gerente_geral", "almoxarifado", "gestor", "patrimonio"],
      cluster: "Logística",
      items: [
        { title: "Painel de Patrimônio", icon: Package, href: "/patrimonio" },
        { title: "Itens do Patrimônio", icon: ListChecks, href: "/patrimonio/itens" },
        { title: "Novo Patrimônio", icon: Plus, href: "/patrimonio/novo" },
        { title: "Categorias e Tipos", icon: Boxes, href: "/patrimonio/categorias" },
        { title: "Movimentações", icon: ArrowLeftRight, href: "/patrimonio/movimentacoes" },
        { title: "Inventário", icon: ClipboardCheck, href: "/patrimonio/inventario" },
        { title: "Etiquetas / QR Code", icon: Tag, href: "/patrimonio/etiquetas" },
        { title: "Importação", icon: FileText, href: "/patrimonio/importacao" },
        { title: "Relatórios", icon: BarChart3, href: "/patrimonio/relatorios" },
      ],
    },
    {
      id: "administracao",
      title: "Administração",
      icon: Settings,
      roles: ["super_admin", "administrador", "coordenador_operacoes", "gerente_geral"],
      cluster: "Sistema",
      items: [
        { title: "Usuários", icon: Users, href: "/admin/usuarios" },
        { title: "Unidades", icon: Building2, href: "/admin/unidades" },
        { title: "Convites", icon: Mail, href: "/admin/convites" },
        { title: "Convites de Fornecedores", icon: Mail, href: "/admin/convites-fornecedores" },
        { title: "Perfis e Permissões", icon: ShieldCheck, href: "/admin/perfis-permissoes" },
        { title: "Configurações Gerais", icon: Settings, href: "/admin/configuracoes-gerais" },
        { title: "Setores / Centro de Custo", icon: Building2, href: "/admin/setores-centro-custo" },
        { title: "Regras de Aprovação", icon: ClipboardCheck, href: "/admin/regras-aprovacao" },
        { title: "Fiscal e Regulatório", icon: ScrollText, href: "/admin/fiscal-regulatorio" },
        { title: "Integrações", icon: Cable, href: "/admin/integracoes" },
        { title: "Auditoria e Logs", icon: Shield, href: "/admin/auditoria-logs" },
      ],
    },
  ];

  const superAdminMenuItems: MenuItem[] = [
    { title: "Dashboard", icon: LayoutDashboard, href: "/super-admin-dashboard", description: "Visão geral do sistema" },
    { title: "Organizações", icon: Building2, href: "/admin-master", description: "Gerenciar todas as organizações" },
    { title: "Auditoria", icon: Shield, href: "/auditoria", description: "Registro de ações do sistema" },
    { title: "Consolidado", icon: FileBarChart, href: "/relatorios-consolidados", description: "Relatórios consolidados multi-tenant" },
    { title: "Configurações", icon: Settings, href: "/configuracoes", description: "Configurações do sistema" },
  ];

  const canAccess = (roles?: string[]) => {
    if (!roles) return true;
    if (isSuperAdmin) return true;
    return !!unigRole && roles.includes(unigRole);
  };

  const isPathActive = (href: string) => {
    const [hrefPath, hrefQuery] = href.split("?");
    if (location.pathname !== hrefPath) return false;
    if (!hrefQuery) return true;
    const itemParams = new URLSearchParams(hrefQuery);
    const currentParams = new URLSearchParams(location.search);
    for (const [k, v] of itemParams) {
      if (currentParams.get(k) !== v) return false;
    }
    return true;
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // Ignore storage read errors.
    }
    return {};
  });

  useEffect(() => {
    const activeGroup = groups.find((g) => g.items.some((i) => isPathActive(i.href)));
    if (activeGroup && !openGroups[activeGroup.id]) {
      setOpenGroups((prev) => ({ ...prev, [activeGroup.id]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
    } catch {
      // Ignore storage write errors.
    }
  }, [openGroups]);

  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
      "[data-radix-scroll-area-viewport]"
    );
    if (!viewport) return;
    const saved = sessionStorage.getItem("sidebar:scroll");
    if (saved) viewport.scrollTop = parseInt(saved, 10) || 0;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        sessionStorage.setItem("sidebar:scroll", String(viewport.scrollTop));
      });
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const visibleGroups = groups
    .filter((g) => !g.hidden)
    .filter((g) => canAccess(g.roles))
    .map((g) => ({ ...g, items: g.items.filter((i) => canAccess(i.roles)) }))
    .filter((g) => g.items.length > 0);

  const renderGroupsWithClusters = (gs: MenuGroup[]) => {
    const out: React.ReactNode[] = [];
    let lastCluster: string | undefined = undefined;
    gs.forEach((g, idx) => {
      const cluster = g.cluster;
      if (cluster && cluster !== lastCluster) {
        if (collapsed) {
          if (idx > 0) {
            out.push(
              <div key={`sep-${cluster}-${idx}`} className="my-2 mx-3 h-px bg-sidebar-border/40" />
            );
          }
        } else {
          out.push(
            <div key={`cluster-${cluster}-${idx}`} className={cn("flex items-center gap-2 px-2", idx === 0 ? "pt-1 pb-1" : "pt-4 pb-1")}>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/45">
                {cluster}
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-sidebar-border/60 via-sidebar-border/20 to-transparent" />
            </div>
          );
        }
        lastCluster = cluster;
      }
      out.push(renderGroup(g));
    });
    return out;
  };

  const renderTopItem = (item: MenuItem) => {
    const active = isPathActive(item.href);
    if (collapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>
            <Link to={item.href}>
              <div className={cn(
                "flex items-center justify-center p-2.5 rounded-xl transition-all",
                active ? "!bg-sidebar-primary !text-sidebar-primary-foreground shadow-lg"
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
              )}>
                <item.icon className="h-5 w-5" />
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-semibold text-sm">{item.title}</p>
            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
          </TooltipContent>
        </Tooltip>
      );
    }
    return (
      <Link key={item.href} to={item.href}>
        <div className={cn(
          "flex items-center gap-3 p-2.5 rounded-xl transition-all",
          active ? "!bg-sidebar-primary !text-sidebar-primary-foreground shadow-lg"
            : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
        )}>
          <item.icon className="h-5 w-5" />
          <span className="text-sm font-medium">{item.title}</span>
        </div>
      </Link>
    );
  };

  const renderGroup = (group: MenuGroup) => {
    const hasActive = group.items.some((i) => isPathActive(i.href));
    const isOpen = openGroups[group.id] ?? hasActive;

    if (collapsed) {
      const groupCount = group.items.reduce((sum, i) => sum + (i.badgeCount ?? 0), 0);
      return (
        <Tooltip key={group.id}>
          <TooltipTrigger asChild>
            <Link to={group.items[0].href}>
              <div className={cn(
                "relative flex items-center justify-center p-2.5 rounded-xl transition-all",
                hasActive ? "!bg-sidebar-primary/15 text-sidebar-primary"
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
              )}>
                <group.icon className="h-5 w-5" />
                {groupCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar-background" />
                )}
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="font-semibold text-sm mb-1">{group.title}</p>
            <ul className="space-y-0.5">
              {group.items.map((i) => (
                <li key={i.href} className="text-xs text-muted-foreground">
                  • {i.title}{i.badgeCount ? ` (${i.badgeCount})` : ''}
                </li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      );
    }

    const groupCount = group.items.reduce((sum, i) => sum + (i.badgeCount ?? 0), 0);
    return (
      <Collapsible key={group.id} open={isOpen} onOpenChange={() => toggleGroup(group.id)}>
        <CollapsibleTrigger className={cn(
          "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left",
          hasActive ? "bg-sidebar-accent/40 text-sidebar-foreground"
            : "hover:bg-sidebar-accent/40 text-sidebar-foreground"
        )}>
          <group.icon className={cn("h-5 w-5", hasActive && "text-sidebar-primary")} />
          <span className="flex-1 text-sm font-semibold">{group.title}</span>
          {groupCount > 0 && !isOpen && (
            <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">{groupCount > 99 ? '99+' : groupCount}</Badge>
          )}
          {isOpen ? <ChevronDown className="h-4 w-4 opacity-60" />
            : <ChevronRight className="h-4 w-4 opacity-60" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 pt-1 space-y-0.5">
          {group.items.map((item) => {
            const active = isPathActive(item.href);
            return (
              <Link key={item.href + item.title} to={item.href}>
                <div className={cn(
                  "flex items-center gap-2.5 p-2 rounded-lg transition-all border-l-2",
                  active
                    ? "!bg-sidebar-primary !text-sidebar-primary-foreground border-sidebar-primary shadow-sm"
                    : "border-transparent hover:bg-sidebar-accent/40 text-sidebar-foreground/90"
                )}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="text-[13px] truncate flex-1">{item.title}</span>
                  {item.badge && (
                    <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">{item.badge}</Badge>
                  )}
                  {item.badgeCount && item.badgeCount > 0 ? (
                    <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">{item.badgeCount > 99 ? '99+' : item.badgeCount}</Badge>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className={cn(
      "relative flex h-full flex-col bg-sidebar-background backdrop-blur-xl border-r border-sidebar-border transition-all duration-300 ease-out",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      <div className={cn("transition-all duration-300", collapsed ? "p-2" : "px-4 py-5")}>
        <div className="flex flex-col items-center justify-center gap-1">
          <img
            src={vstockLogo}
            alt="UNIG Facilities"
            className={cn(
              "object-contain transition-all duration-300 brightness-0 invert",
              collapsed ? "h-12 w-12" : "h-20 md:h-24 w-auto",
            )}
          />
        </div>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 px-3 pt-2">
        <TooltipProvider delayDuration={200}>
          {unigRole === 'gestor' ? (
            <div className="space-y-1 py-1">
              {renderTopItem({ title: "Início", icon: Home, href: "/unigops/ci/public", description: "Portal do Gestor" })}
              {renderTopItem({ title: "Nova CI", icon: Plus, href: "/unigops/ci/formulario", description: "Abrir nova requisição" })}
              {renderTopItem({ title: "Minhas CIs", icon: ListChecks, href: "/unigops/ci/consulta", description: "Acompanhar minhas requisições" })}
              {renderTopItem({ title: "Base de Conhecimento", icon: FileText, href: "/unigops/ci/base-conhecimento", description: "Orientações e procedimentos" })}
              {renderTopItem({ title: "Avisos", icon: Bell, href: "/unigops/ci/avisos", description: "Comunicados" })}
              <div className="h-2" />
              {(() => {
                const demandasGroup = visibleGroups.find((g) => g.id === 'demandas');
                return demandasGroup ? renderGroup(demandasGroup) : null;
              })()}
              <div className="h-2" />
              {renderTopItem({ title: "Alertas", icon: Bell, href: "/alertas", description: "Notificações" })}
            </div>
          ) : variant === "solicitante" ? (
            <div className="space-y-1 py-1">
              {renderTopItem({ title: "Início", icon: Home, href: "/unigops/ci/public", description: "Portal do Solicitante" })}
              {renderTopItem({ title: "Nova CI", icon: Plus, href: "/unigops/ci/formulario", description: "Abrir nova requisição" })}
              {renderTopItem({ title: "Minhas CIs", icon: ListChecks, href: "/unigops/ci/consulta", description: "Acompanhar minhas requisições" })}
              {renderTopItem({ title: "Base de Conhecimento", icon: FileText, href: "/unigops/ci/base-conhecimento", description: "Orientações e procedimentos" })}
              {renderTopItem({ title: "Avisos", icon: Bell, href: "/unigops/ci/avisos", description: "Comunicados" })}
            </div>
          ) : isSuperAdmin ? (
            <div className="space-y-1 py-1">
              {renderTopItem(dashboardItem)}
              <div className="h-2" />
              {renderGroupsWithClusters(visibleGroups)}
              <div className="h-2" />
              {renderTopItem({ title: "Alertas", icon: Bell, href: "/alertas", description: "Notificações" })}
              <div className="h-2" />
              <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Super Admin</div>
              {superAdminMenuItems.map((item) => renderTopItem(item))}
            </div>
          ) : unigRole === 'solicitante' ? (
            <div className="space-y-1 py-1">
              {renderTopItem(solicitanteHomeItem)}
              <div className="h-2" />
              {visibleGroups.map((g) => renderGroup(g))}
              <div className="h-2" />
              {renderTopItem({ title: "Alertas", icon: Bell, href: "/alertas", description: "Notificações" })}
            </div>
          ) : (
            <div className="space-y-1 py-1">
              {renderTopItem(dashboardItem)}
              <div className="h-2" />
              {renderGroupsWithClusters(visibleGroups)}
              <div className="h-2" />
              {renderTopItem({ title: "Alertas", icon: Bell, href: "/alertas", description: "Notificações" })}
            </div>
          )}

        </TooltipProvider>
      </ScrollArea>


      <div className={cn("bg-sidebar-background/50 backdrop-blur-sm transition-all duration-300", collapsed ? "p-2" : "p-3")}>
        {collapsed ? (
          <div className="flex justify-center">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-md">
              <span className="text-sm font-semibold text-primary-foreground">
                {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || "U"}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-sidebar-accent/50 border border-sidebar-border/30 shadow-sm">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-md">
              <span className="text-sm font-semibold text-primary-foreground">
                {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-sidebar-foreground">
                {profile?.full_name || "Usuário"}
              </p>
              <p className="text-xs text-sidebar-foreground/70">
                {UNIG_ROLE_LABEL[unigRole]}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
