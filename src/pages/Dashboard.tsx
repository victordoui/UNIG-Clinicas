import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { RecentMovements } from "@/components/dashboard/RecentMovements";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { AlertsModal } from "@/components/dashboard/AlertsModal";
import { ActiveUsersModal } from "@/components/dashboard/ActiveUsersModal";
import { UserApprovalModal } from "@/components/users/UserApprovalModal";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useSessionTracking } from "@/hooks/useSessionTracking";
import { useMyPendingApprovals } from "@/hooks/useApprovalWorkflow";
import { useMySectorRequests } from "@/hooks/useMySectorRequests";
import { CoverBanner } from "@/components/profile/CoverBanner";
import { CoverEditor } from "@/components/profile/CoverEditor";
import { useProfileCover } from "@/hooks/useProfileCover";
import { UNIG_ROLE_LABEL } from "@/lib/unigRoles";
import { Button } from "@/components/ui/button";
import {
  Package, ArrowRightLeft, Bell, Users, UserPlus, Sparkles, Inbox,
  ClipboardList, TrendingUp, Plus, Building2, ChevronRight, CheckCircle2, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

type Tone = "primary" | "emerald" | "amber" | "destructive" | "violet";

const toneStyles: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  destructive: "bg-destructive/10 text-destructive",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  loading?: boolean;
  onClick?: () => void;
}

function KpiCard({ icon: Icon, label, value, hint, tone = "primary", loading, onClick }: KpiCardProps) {
  const interactive = !!onClick;
  const Comp: any = interactive ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "group relative w-full text-left rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm transition-all duration-200 overflow-hidden animate-fade-in",
        interactive && "hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/40 cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", toneStyles[tone])}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
        {interactive && (
          <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
        )}
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-foreground leading-tight mt-1 truncate">
          {loading ? "…" : value}
        </p>
        {hint && <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>}
      </div>
    </Comp>
  );
}

export default function Dashboard() {
  const { stats } = useDashboard();
  const { currentRole, organization, profile, unigRole } = useAuth();
  const navigate = useNavigate();
  const { data: pendingApprovals } = useMyPendingApprovals();
  const { data: sector } = useMySectorRequests();
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [activeUsersModalOpen, setActiveUsersModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const { state: cover } = useProfileCover();
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);

  useSessionTracking();

  const canManageUsers = currentRole && ["admin", "gerente"].includes(currentRole);
  const orgName = (organization as any)?.organization?.name || (organization as any)?.name || "Sua organização";
  const firstName = (profile?.full_name || profile?.email || "Usuário").split(" ")[0];
  const roleLabel = (unigRole && UNIG_ROLE_LABEL[unigRole as any]) || currentRole || "";

  return (
    <MainLayout>
      <div className="space-y-5 animate-fade-in pb-8">
        {/* HERO — Capa personalizável (padrão Solicitante) */}
        <CoverBanner cover={cover} onEdit={() => setCoverEditorOpen(true)}>
          <div className="pt-4 px-4 pb-3 lg:pt-5 lg:px-6 lg:pb-4">
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 xl:gap-6 min-w-0">
              <div className="relative space-y-3 max-w-xl min-w-0 flex-1">
                <div
                  className="flex items-center gap-2 text-white text-[11px] font-bold uppercase tracking-[0.18em]"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 2px 10px rgba(0,0,0,0.45)' }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Painel Geral
                  </span>
                </div>
                <h1
                  className="text-2xl lg:text-4xl font-bold tracking-tight text-white leading-tight"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7), 0 3px 14px rgba(0,0,0,0.5)' }}
                >
                  {greet()}, {firstName} 👋
                </h1>
                <p
                  className="text-white/95 text-[13px] lg:text-[14px] leading-snug"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 2px 10px rgba(0,0,0,0.45)' }}
                >
                  <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4" /> {orgName}</span>
                  {roleLabel && (
                    <>
                      <span className="opacity-60 mx-2">·</span>
                      <span className="inline-flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> {roleLabel}</span>
                    </>
                  )}
                </p>
                <div className="flex flex-row flex-wrap gap-2 sm:gap-3 pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setAlertsModalOpen(true)}
                    className="bg-white/15 hover:bg-white/25 text-white border-white/20 backdrop-blur"
                  >
                    <Bell className="h-4 w-4 mr-1.5" /> Alertas
                    {stats.activeAlerts > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-white text-primary text-[11px] font-bold">
                        {stats.activeAlerts}
                      </span>
                    )}
                  </Button>
                  <Link to="/movimentacoes">
                    <Button size="sm" className="bg-white text-primary hover:bg-white/90 shadow-md">
                      <Plus className="h-4 w-4 mr-1.5" /> Nova movimentação
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </CoverBanner>

        <CoverEditor open={coverEditorOpen} onOpenChange={setCoverEditorOpen} />


        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            icon={Package}
            label="Total de produtos"
            value={stats.totalProducts.toLocaleString("pt-BR")}
            hint="cadastrados"
            tone="primary"
            loading={stats.loading}
            onClick={() => navigate("/produtos")}
          />
          <KpiCard
            icon={ArrowRightLeft}
            label="Movimentações hoje"
            value={stats.movementsToday.toLocaleString("pt-BR")}
            hint="entradas, saídas e transferências"
            tone="emerald"
            loading={stats.loading}
            onClick={() => navigate("/movimentacoes")}
          />
          <KpiCard
            icon={Bell}
            label="Alertas ativos"
            value={stats.activeAlerts.toLocaleString("pt-BR")}
            hint="notificações pendentes"
            tone="amber"
            loading={stats.loading}
            onClick={() => setAlertsModalOpen(true)}
          />
          <KpiCard
            icon={Users}
            label="Usuários ativos"
            value={stats.activeUsers.toLocaleString("pt-BR")}
            hint="na organização"
            tone="violet"
            loading={stats.loading}
            onClick={() => setActiveUsersModalOpen(true)}
          />
        </div>

        {/* Minhas aprovações */}
        {pendingApprovals && pendingApprovals.count > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground px-1">Minhas aprovações</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <KpiCard
                icon={Inbox}
                label="Aprovações pendentes para mim"
                value={pendingApprovals.count.toString()}
                hint={
                  pendingApprovals.nextDeadline
                    ? `Próximo prazo: ${new Date(pendingApprovals.nextDeadline).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                    : "Sem prazo definido"
                }
                tone="amber"
                onClick={() => navigate("/aprovacoes")}
              />
            </div>
          </section>
        )}

        {/* Requisições do meu setor */}
        {sector?.visible && sector.total > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground px-1">Requisições do meu setor</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard
                icon={ClipboardList}
                label="Pendentes"
                value={sector.pendentes.toString()}
                tone="amber"
                onClick={() => navigate("/solicitacoes?status=pendente")}
              />
              <KpiCard
                icon={Inbox}
                label="Em aprovação"
                value={sector.emAprovacao.toString()}
                tone="primary"
                onClick={() => navigate("/aprovacoes")}
              />
              <KpiCard
                icon={CheckCircle2}
                label="Aprovadas"
                value={sector.aprovadas.toString()}
                tone="emerald"
                onClick={() => navigate("/solicitacoes?status=aprovada")}
              />
              <KpiCard
                icon={XCircle}
                label="Reprovadas"
                value={sector.reprovadas.toString()}
                tone="destructive"
                onClick={() => navigate("/solicitacoes?status=reprovada")}
              />
            </div>
          </section>
        )}

        {/* Ações administrativas */}
        {canManageUsers && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground px-1">Ações administrativas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <KpiCard
                icon={UserPlus}
                label="Aprovar usuários"
                value="Pendentes"
                hint="Solicitações de novos usuários"
                tone="violet"
                onClick={() => setApprovalModalOpen(true)}
              />
            </div>
          </section>
        )}

        {/* Atividade Recente */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-foreground px-1">Atividade recente</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden animate-fade-in">
              <RecentMovements />
            </div>
            <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden animate-fade-in">
              <AlertsPanel />
            </div>
          </div>
        </section>
      </div>

      {/* Modals */}
      <AlertsModal open={alertsModalOpen} onOpenChange={setAlertsModalOpen} />
      <ActiveUsersModal open={activeUsersModalOpen} onOpenChange={setActiveUsersModalOpen} />
      <UserApprovalModal open={approvalModalOpen} onOpenChange={setApprovalModalOpen} />
    </MainLayout>
  );
}
