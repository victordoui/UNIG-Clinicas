import { Link } from "react-router-dom";
import {
  Package, ArrowDownUp, AlertTriangle, ArrowLeftRight, Plus, ScanLine,
  ClipboardCheck, Boxes, Warehouse,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useDashboard } from "@/hooks/useDashboard";
import { RoleHomeCover } from "@/components/dashboard/RoleHomeCover";

export function DashboardAlmoxarifado() {
  const { stats } = useDashboard();
  return (
    <div className="space-y-6 animate-fade-in">
      <RoleHomeCover
        chipLabel="Painel do Almoxarifado"
        chipIcon={Warehouse}
        description="Visão operacional de estoque, movimentações e alertas."
        ctas={[
          { label: "Nova movimentação", icon: Plus, to: "/movimentacoes", primary: true },
          { label: "Produtos", icon: Boxes, to: "/produtos" },
        ]}
        kpis={[
          { label: "Produtos", subtitle: "cadastrados", value: stats.loading ? "…" : stats.totalProducts.toLocaleString("pt-BR"), icon: Package, tone: "blue", to: "/produtos" },
          { label: "Movimentações", subtitle: "hoje", value: stats.loading ? "…" : stats.movementsToday, icon: ArrowDownUp, tone: "emerald", to: "/movimentacoes" },
          { label: "Alertas", subtitle: "ativos", value: stats.loading ? "…" : stats.activeAlerts, icon: AlertTriangle, tone: "orange", to: "/alertas" },
          { label: "Transferências", subtitle: "em curso", value: "—", icon: ArrowLeftRight, tone: "violet" },
        ]}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <QuickAction to="/dashboard/produtos" icon={Boxes} title="Produtos" />
        <QuickAction to="/dashboard/movimentacoes" icon={ArrowDownUp} title="Movimentações" />
        <QuickAction to="/dashboard/transferencias" icon={ArrowLeftRight} title="Transferências" />
        <QuickAction to="/dashboard/inventario" icon={ClipboardCheck} title="Inventário" />
        <QuickAction to="/dashboard/scanner" icon={ScanLine} title="Scanner" />
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-2">Atalhos rápidos</h2>
        <p className="text-sm text-muted-foreground">Use os botões acima para acessar rapidamente as operações de estoque do dia a dia.</p>
      </Card>
    </div>
  );
}

function QuickAction({ to, icon: Icon, title }: any) {
  return (
    <Link to={to}>
      <Card className="p-4 h-full hover:shadow-md hover:border-primary/30 transition-all">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="font-semibold text-sm">{title}</div>
        </div>
      </Card>
    </Link>
  );
}
