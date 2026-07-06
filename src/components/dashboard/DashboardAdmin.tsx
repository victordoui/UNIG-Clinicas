import { Link } from "react-router-dom";
import {
  FileSignature, Clock, ShoppingCart, CheckCircle2, Plus, MessageSquare,
  KanbanSquare, Inbox, Briefcase, BarChart3, Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { CIStatusBadge } from "@/components/ci/CIStatusBadge";
import { useCIList } from "@/hooks/useCI";
import { useAuth } from "@/hooks/useAuth";
import { RoleHomeCover } from "@/components/dashboard/RoleHomeCover";

export function DashboardAdmin() {
  const { user } = useAuth();
  const { data: all, isLoading } = useCIList();
  const list = all ?? [];

  const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);

  const abertas = list.filter(c => !["finalizada", "cancelada", "reprovada"].includes(c.status)).length;
  const aguardando = list.filter(c => c.status === "aguardando_aprovacao").length;
  const emCompras = list.filter(c => ["em_compras" as any, "em_cotacao", "pedido_emitido", "aguardando_entrega"].includes(c.status)).length;
  const finalizadasMes = list.filter(c => c.status === "finalizada" && new Date(c.updated_at) >= startMonth).length;

  const minhas = list.filter(c => c.created_by === user?.id).slice(0, 5);
  const pendentesMinhas = list.filter((c: any) =>
    c.status === "aguardando_aprovacao" || (["aprovada", "em_cotacao"].includes(c.status) && c.assigned_to === user?.id)
  ).slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <RoleHomeCover
        chipLabel="Painel da Administração"
        chipIcon={Sparkles}
        description="Visão consolidada da operação — CIs, aprovações e compras em um só lugar."
        ctas={[
          { label: "Nova CI", icon: Plus, to: "/dashboard/ci/formulario", primary: true },
          { label: "Kanban CI", icon: KanbanSquare, to: "/dashboard/ci/kanban" },
        ]}
        kpis={[
          { label: "Em aberto", subtitle: "CIs ativas", value: isLoading ? "…" : abertas, icon: FileSignature, tone: "blue", to: "/dashboard/ci" },
          { label: "Aguardando", subtitle: "aprovação", value: isLoading ? "…" : aguardando, icon: Clock, tone: "orange", to: "/dashboard/ci" },
          { label: "Em compras", subtitle: "cotação / pedido", value: isLoading ? "…" : emCompras, icon: ShoppingCart, tone: "violet", to: "/dashboard/ci" },
          { label: "Finalizadas", subtitle: "este mês", value: isLoading ? "…" : finalizadasMes, icon: CheckCircle2, tone: "emerald", to: "/dashboard/ci" },
        ]}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction to="/dashboard/ci/formulario" icon={Plus} title="Nova CI" desc="Abrir requisição" />
        <QuickAction to="/dashboard/ci/chatbot" icon={MessageSquare} title="Chatbot CI" desc="Assistente Ops" />
        <QuickAction to="/dashboard/ci/kanban" icon={KanbanSquare} title="Kanban CI" desc="Visão de fluxo" />
        <QuickAction to="/compras/kanban" icon={Briefcase} title="Compras" desc="Painel de pedidos" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><FileSignature className="h-4 w-4 text-primary" /> Minhas CIs recentes</h2>
            <Link to="/dashboard/ci/minhas" className="text-xs text-primary hover:underline">Ver todas</Link>
          </div>
          <CIList rows={minhas} emptyText="Você ainda não abriu nenhuma CI." />
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Inbox className="h-4 w-4 text-primary" /> Aguardando minha ação</h2>
            <Link to="/dashboard/ci" className="text-xs text-primary hover:underline">Ver painel</Link>
          </div>
          <CIList rows={pendentesMinhas} emptyText="Nada pendente para você no momento." />
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3"><BarChart3 className="h-4 w-4 text-primary" /> CIs por status</h2>
        <StatusBars list={list} />
      </Card>
    </div>
  );
}

function QuickAction({ to, icon: Icon, title, desc }: any) {
  return (
    <Link to={to}>
      <Card className="p-4 h-full hover:shadow-md hover:border-primary/30 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm">{title}</div>
            <div className="text-xs text-muted-foreground">{desc}</div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function CIList({ rows, emptyText }: { rows: any[]; emptyText: string }) {
  if (!rows || rows.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="divide-y">
      {rows.map((c) => (
        <li key={c.id} className="py-2 flex items-center justify-between gap-3">
          <Link to={`/dashboard/ci/${c.id}`} className="flex-1 min-w-0">
            <div className="font-mono text-xs text-primary">{c.protocol}</div>
            <div className="text-sm truncate">{c.subject}</div>
          </Link>
          <CIStatusBadge status={c.status} />
        </li>
      ))}
    </ul>
  );
}

function StatusBars({ list }: { list: any[] }) {
  const counts: Record<string, number> = {};
  list.forEach((c) => { counts[c.status] = (counts[c.status] ?? 0) + 1; });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  const max = Math.max(...entries.map(([, v]) => v));
  return (
    <div className="space-y-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-3">
          <div className="w-44 text-xs text-muted-foreground capitalize">{k.replace(/_/g, " ")}</div>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <div className="w-8 text-right text-sm font-medium">{v}</div>
        </div>
      ))}
    </div>
  );
}
