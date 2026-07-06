import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, formatDistanceToNow, startOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Shield,
  Search,
  Download,
  X,
  Calendar as CalendarIcon,
  Users,
  Activity,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Filter,
  Building2,
  Globe,
  ShoppingCart,
  FileText,
  Package,
  UserCog,
  ClipboardCheck,
  Receipt,
  LogIn,
  LogOut,
  Truck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportUtils";

// ---------------- Action metadata ----------------
type Category =
  | "requisicao"
  | "aprovacao"
  | "compras"
  | "fiscal"
  | "recebimento"
  | "usuario"
  | "produto"
  | "estoque"
  | "auth"
  | "outros";

interface ActionMeta {
  label: string;
  category: Category;
  icon: any;
  destructive?: boolean;
}

const ACTION_META: Record<string, ActionMeta> = {
  // Produtos / estoque
  product_created: { label: "Produto criado", category: "produto", icon: Package },
  product_updated: { label: "Produto atualizado", category: "produto", icon: Package },
  product_deleted: { label: "Produto excluído", category: "produto", icon: Package, destructive: true },
  movement_created: { label: "Movimentação de estoque", category: "estoque", icon: Activity },
  stock_transferred: { label: "Transferência de estoque", category: "estoque", icon: Truck },
  // Usuários
  user_invited: { label: "Usuário convidado", category: "usuario", icon: UserCog },
  user_removed: { label: "Usuário removido", category: "usuario", icon: UserCog, destructive: true },
  user_role_changed: { label: "Permissão alterada", category: "usuario", icon: UserCog },
  user_login: { label: "Login realizado", category: "auth", icon: LogIn },
  user_logout: { label: "Logout", category: "auth", icon: LogOut },
  // Requisições
  ci_created: { label: "Requisição criada", category: "requisicao", icon: FileText },
  ci_updated: { label: "Requisição atualizada", category: "requisicao", icon: FileText },
  ci_validated: { label: "Requisição validada", category: "requisicao", icon: ClipboardCheck },
  ci_approved: { label: "Requisição aprovada", category: "aprovacao", icon: ClipboardCheck },
  ci_rejected: { label: "Requisição recusada", category: "aprovacao", icon: ClipboardCheck, destructive: true },
  approval_created: { label: "Aprovação iniciada", category: "aprovacao", icon: ClipboardCheck },
  approval_decided: { label: "Aprovação decidida", category: "aprovacao", icon: ClipboardCheck },
  // Compras
  purchase_request_created: { label: "Solicitação de compra", category: "compras", icon: ShoppingCart },
  purchase_order_created: { label: "Pedido de compra criado", category: "compras", icon: ShoppingCart },
  purchase_order_updated: { label: "Pedido de compra atualizado", category: "compras", icon: ShoppingCart },
  quote_received: { label: "Cotação recebida", category: "compras", icon: ShoppingCart },
  // Fiscal
  invoice_emitted: { label: "Nota fiscal emitida", category: "fiscal", icon: Receipt },
  invoice_received: { label: "Nota fiscal recebida", category: "fiscal", icon: Receipt },
  // Recebimentos
  receipt_confirmed: { label: "Recebimento confirmado", category: "recebimento", icon: Truck },
  divergence_reported: { label: "Divergência reportada", category: "recebimento", icon: Truck, destructive: true },
};

const CATEGORY_STYLE: Record<Category, { badge: string; ring: string; label: string }> = {
  requisicao:  { badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",     ring: "ring-blue-500/30",   label: "Requisição" },
  aprovacao:   { badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20", ring: "ring-violet-500/30", label: "Aprovação" },
  compras:     { badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20", ring: "ring-amber-500/30",  label: "Compras" },
  fiscal:      { badge: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/20", ring: "ring-fuchsia-500/30", label: "Fiscal" },
  recebimento: { badge: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",     ring: "ring-teal-500/30",   label: "Recebimento" },
  usuario:     { badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20", ring: "ring-emerald-500/30", label: "Usuário" },
  produto:     { badge: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",     ring: "ring-cyan-500/30",   label: "Produto" },
  estoque:     { badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",         ring: "ring-sky-500/30",    label: "Estoque" },
  auth:        { badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20", ring: "ring-slate-500/30",  label: "Autenticação" },
  outros:      { badge: "bg-muted text-muted-foreground border-border",                            ring: "ring-muted",         label: "Outros" },
};

function describeAction(log: any): string {
  const meta = ACTION_META[log.action];
  const d = log.details || {};
  const name = d.name || d.nome || d.protocol || d.protocolo || d.numero || d.number || d.sku || d.code;
  if (meta && name) return `${meta.label} — ${name}`;
  return meta?.label || log.action;
}

type PeriodKey = "today" | "7d" | "30d" | "custom" | "all";

// ---------------- Component ----------------
export default function AuditoriaLogs() {
  const { organization, isSuperAdmin, loading: authLoading, currentRole } = useAuth();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("7d");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [stats, setStats] = useState({ today: 0, uniqueUsers: 0, topAction: "—" });
  const logsPerPage = 30;

  useEffect(() => {
    if (!authLoading && currentRole !== "admin" && !isSuperAdmin) {
      navigate("/dashboard");
    }
  }, [currentRole, isSuperAdmin, authLoading, navigate]);

  useEffect(() => {
    if (currentRole === "admin" || isSuperAdmin) {
      loadOrganizations();
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRole, isSuperAdmin]);

  useEffect(() => {
    if (currentRole === "admin" || isSuperAdmin) {
      loadAuditLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentRole,
    isSuperAdmin,
    currentPage,
    period,
    selectedOrgId,
    selectedUserId,
    actionFilter,
    categoryFilter,
    customStart,
    customEnd,
  ]);

  const loadOrganizations = async () => {
    const { data } = await supabase
      .from("organizations")
      .select("id, name, subscription_plan")
      .order("name");
    setOrganizations(data || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .order("full_name");
    setUsers(data || []);
  };

  const computeDateRange = (): { start: Date | null; end: Date | null } => {
    const now = new Date();
    if (period === "today") return { start: startOfDay(now), end: now };
    if (period === "7d") return { start: subDays(now, 7), end: now };
    if (period === "30d") return { start: subDays(now, 30), end: now };
    if (period === "custom") return { start: customStart, end: customEnd };
    return { start: null, end: null };
  };

  const applyFilters = (q: any) => {
    const { start, end } = computeDateRange();
    if (!isSuperAdmin && organization?.organization_id)
      q = q.eq("organization_id", organization.organization_id);
    if (selectedOrgId !== "all") q = q.eq("organization_id", selectedOrgId);
    if (selectedUserId !== "all") q = q.eq("user_id", selectedUserId);
    if (actionFilter !== "all") q = q.eq("action", actionFilter);
    if (categoryFilter !== "all") {
      const actions = Object.entries(ACTION_META)
        .filter(([, m]) => m.category === categoryFilter)
        .map(([a]) => a);
      if (actions.length) q = q.in("action", actions);
    }
    if (start) q = q.gte("created_at", start.toISOString());
    if (end) q = q.lte("created_at", end.toISOString());
    return q;
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      // Count
      const { count } = await applyFilters(
        supabase.from("security_audit_log").select("*", { count: "exact", head: true })
      );
      setTotalLogs(count || 0);

      // Page data — sem embed (que estava retornando null)
      const { data: rawLogs, error } = await applyFilters(
        supabase
          .from("security_audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .range((currentPage - 1) * logsPerPage, currentPage * logsPerPage - 1)
      );

      if (error) throw error;

      const userIds = [...new Set((rawLogs || []).map((l: any) => l.user_id as string).filter(Boolean))] as string[];
      const orgIds = [...new Set((rawLogs || []).map((l: any) => l.organization_id as string).filter(Boolean))] as string[];

      const [profilesRes, orgsRes] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", userIds)
          : Promise.resolve({ data: [] as any[] }),
        orgIds.length
          ? supabase.from("organizations").select("id, name, subscription_plan").in("id", orgIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const orgMap = new Map((orgsRes.data || []).map((o: any) => [o.id, o]));

      const enriched = (rawLogs || []).map((l: any) => ({
        ...l,
        profile: profileMap.get(l.user_id),
        organization: orgMap.get(l.organization_id),
      }));
      setLogs(enriched);

      // Quick stats (only on first page load)
      if (currentPage === 1) {
        const todayStart = startOfDay(new Date()).toISOString();
        const { count: todayCount } = await applyFilters(
          supabase
            .from("security_audit_log")
            .select("*", { count: "exact", head: true })
            .gte("created_at", todayStart)
        );
        const uniqueUsers = new Set(enriched.map((l) => l.user_id).filter(Boolean)).size;
        const actionCounts = enriched.reduce((acc: Record<string, number>, l) => {
          acc[l.action] = (acc[l.action] || 0) + 1;
          return acc;
        }, {});
        const topAction = (Object.entries(actionCounts) as [string, number][]).sort((a, b) => b[1] - a[1])[0]?.[0];
        setStats({
          today: todayCount || 0,
          uniqueUsers,
          topAction: topAction ? ACTION_META[topAction]?.label || topAction : "—",
        });
      }
    } catch (e: any) {
      console.error("[AuditoriaLogs] erro", e);
      toast.error("Erro ao carregar logs de auditoria");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const s = search.toLowerCase();
    return logs.filter((l) => {
      return (
        l.profile?.full_name?.toLowerCase().includes(s) ||
        l.profile?.email?.toLowerCase().includes(s) ||
        l.organization?.name?.toLowerCase().includes(s) ||
        l.action?.toLowerCase().includes(s) ||
        l.ip_address?.toLowerCase().includes(s) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(s)
      );
    });
  }, [logs, search]);

  const totalPages = Math.max(1, Math.ceil(totalLogs / logsPerPage));

  const clearFilters = () => {
    setSearch("");
    setPeriod("7d");
    setSelectedOrgId("all");
    setSelectedUserId("all");
    setActionFilter("all");
    setCategoryFilter("all");
    setCustomStart(null);
    setCustomEnd(null);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    search ||
    period !== "7d" ||
    selectedOrgId !== "all" ||
    selectedUserId !== "all" ||
    actionFilter !== "all" ||
    categoryFilter !== "all";

  const handleExport = () => {
    const data = filteredLogs.map((l) => ({
      "Data/Hora": format(new Date(l.created_at), "dd/MM/yyyy HH:mm:ss"),
      Organização: l.organization?.name || "—",
      Usuário: l.profile?.full_name || "—",
      Email: l.profile?.email || "—",
      Categoria: CATEGORY_STYLE[ACTION_META[l.action]?.category || "outros"].label,
      Ação: ACTION_META[l.action]?.label || l.action,
      Descrição: describeAction(l),
      IP: l.ip_address || "—",
      "User Agent": l.user_agent || "—",
      Detalhes: JSON.stringify(l.details),
    }));
    exportToExcel(data, `auditoria_${format(new Date(), "yyyy-MM-dd")}.xlsx`, "Auditoria");
    toast.success("Logs exportados com sucesso!");
  };

  const initials = (name?: string) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?";

  if (authLoading || (currentRole !== "admin" && !isSuperAdmin)) return null;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              Auditoria e Logs
            </h1>
            <p className="text-muted-foreground mt-1.5">
              Registro completo de ações do sistema — requisições, aprovações, compras, fiscal, usuários e segurança.
            </p>
          </div>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} size="sm">
                <X className="h-4 w-4 mr-1.5" /> Limpar
              </Button>
            )}
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1.5" /> Exportar
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={Activity} label="Total no período" value={totalLogs.toLocaleString("pt-BR")} accent="bg-primary/10 text-primary" />
          <KpiCard icon={TrendingUp} label="Hoje" value={stats.today.toLocaleString("pt-BR")} accent="bg-emerald-500/10 text-emerald-600" />
          <KpiCard icon={Users} label="Usuários ativos (página)" value={stats.uniqueUsers.toString()} accent="bg-blue-500/10 text-blue-600" />
          <KpiCard icon={ClipboardCheck} label="Ação mais frequente" value={stats.topAction} accent="bg-violet-500/10 text-violet-600" small />
        </div>

        {/* Filters bar */}
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuário, ação, IP, organização..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {isSuperAdmin && (
                  <Select value={selectedOrgId} onValueChange={(v) => { setSelectedOrgId(v); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[180px]">
                      <Building2 className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="Organização" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas organizações</SelectItem>
                      {organizations.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={selectedUserId} onValueChange={(v) => { setSelectedUserId(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[180px]">
                    <Users className="h-4 w-4 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos usuários</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v as any); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas categorias</SelectItem>
                    {Object.entries(CATEGORY_STYLE).map(([k, s]) => (
                      <SelectItem key={k} value={k}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Period chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground mr-1">Período:</span>
              {([
                { k: "today", l: "Hoje" },
                { k: "7d", l: "7 dias" },
                { k: "30d", l: "30 dias" },
                { k: "all", l: "Tudo" },
              ] as { k: PeriodKey; l: string }[]).map((p) => (
                <Button
                  key={p.k}
                  size="sm"
                  variant={period === p.k ? "default" : "outline"}
                  className="h-7 rounded-full text-xs px-3"
                  onClick={() => { setPeriod(p.k); setCurrentPage(1); }}
                >
                  {p.l}
                </Button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant={period === "custom" ? "default" : "outline"}
                    className="h-7 rounded-full text-xs px-3"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                    {period === "custom" && customStart
                      ? `${format(customStart, "dd/MM")} – ${customEnd ? format(customEnd, "dd/MM") : "…"}`
                      : "Custom"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3 flex gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Início</p>
                      <Calendar
                        mode="single"
                        selected={customStart || undefined}
                        onSelect={(d) => { setCustomStart(d || null); setPeriod("custom"); setCurrentPage(1); }}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Fim</p>
                      <Calendar
                        mode="single"
                        selected={customEnd || undefined}
                        onSelect={(d) => { setCustomEnd(d || null); setPeriod("custom"); setCurrentPage(1); }}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Feed */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-2">
              <EmptyState
                icon={Shield}
                title="Nenhum log encontrado"
                description={
                  hasActiveFilters
                    ? "Tente ajustar os filtros ou ampliar o período."
                    : "Ainda não há registros de auditoria neste período."
                }
                action={
                  hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters} size="sm">
                      <X className="h-4 w-4 mr-1.5" /> Limpar filtros
                    </Button>
                  )
                }
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-xs text-muted-foreground px-1">
              Mostrando {(currentPage - 1) * logsPerPage + 1}–
              {Math.min(currentPage * logsPerPage, totalLogs)} de {totalLogs.toLocaleString("pt-BR")} registros
            </div>
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <LogCard
                  key={log.id}
                  log={log}
                  expanded={expanded === log.id}
                  onToggle={() => setExpanded(expanded === log.id ? null : log.id)}
                  initials={initials}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página <span className="font-medium text-foreground">{currentPage}</span> de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}

// ---------------- Subcomponents ----------------
function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
  small,
}: {
  icon: any;
  label: string;
  value: string;
  accent: string;
  small?: boolean;
}) {
  return (
    <Card className="border-border/60 hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("p-2.5 rounded-lg", accent)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className={cn("font-semibold truncate", small ? "text-sm" : "text-xl")}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LogCard({
  log,
  expanded,
  onToggle,
  initials,
}: {
  log: any;
  expanded: boolean;
  onToggle: () => void;
  initials: (n?: string) => string;
}) {
  const meta: ActionMeta = ACTION_META[log.action] || { label: log.action, category: "outros", icon: Activity };
  const style = CATEGORY_STYLE[meta.category];
  const ActionIcon = meta.icon;
  const dt = new Date(log.created_at);

  return (
    <Card
      className={cn(
        "border-border/60 transition-all hover:shadow-md hover:border-border cursor-pointer",
        expanded && "ring-2",
        expanded && style.ring
      )}
      onClick={onToggle}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon column */}
          <div className={cn("p-2 rounded-lg shrink-0", style.badge.split(" ").slice(0, 1).join(" "))}>
            <ActionIcon className={cn("h-4 w-4", style.badge.split(" ").find((c) => c.startsWith("text-")))} />
          </div>

          {/* Main */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn("text-[10px] font-medium", style.badge)}>
                {style.label}
              </Badge>
              {meta.destructive && (
                <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                  destrutivo
                </Badge>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground cursor-help">
                      {formatDistanceToNow(dt, { addSuffix: true, locale: ptBR })}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{format(dt, "dd/MM/yyyy HH:mm:ss")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-sm font-medium mt-1.5 text-foreground">{describeAction(log)}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px]">{initials(log.profile?.full_name)}</AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[160px]">{log.profile?.full_name || "Sistema"}</span>
              </div>
              {log.organization?.name && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate max-w-[140px]">{log.organization.name}</span>
                </span>
              )}
              {log.ip_address && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {log.ip_address}
                </span>
              )}
            </div>
          </div>

          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-border/60 animate-fade-in">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Detalhes</p>
            <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-auto max-h-64 font-mono">
              {JSON.stringify(log.details || {}, null, 2)}
            </pre>
            {log.user_agent && (
              <p className="text-[10px] text-muted-foreground mt-2 break-all">
                <span className="font-medium">User Agent:</span> {log.user_agent}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
