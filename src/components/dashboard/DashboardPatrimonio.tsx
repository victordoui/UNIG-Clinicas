import { Link } from "react-router-dom";
import {
  Package, Plus, ListChecks, FolderTree, ArrowLeftRight, ClipboardList,
  Tag, Upload, BarChart3, CheckCircle2, Wrench, DollarSign,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { RoleHomeCover } from "@/components/dashboard/RoleHomeCover";
import { useAssetsAggregates } from "@/hooks/useAssets";
import { PatrimonyPendingIssues } from "@/components/patrimonio/PatrimonyPendingIssues";
import { PatrimonyRecentMovements } from "@/components/patrimonio/PatrimonyRecentMovements";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function DashboardPatrimonio() {
  const { aggregates, isLoading } = useAssetsAggregates({});
  const load = (v: any) => (isLoading ? "…" : v);

  return (
    <div className="space-y-6 animate-fade-in">
      <RoleHomeCover
        chipLabel="Painel do Patrimônio"
        chipIcon={Package}
        description="Gestão completa dos bens da instituição — indicadores, pendências e movimentações em um só lugar."
        ctas={[
          { label: "Novo Patrimônio", icon: Plus, to: "/patrimonio/novo", primary: true },
          { label: "Ver Itens", icon: ListChecks, to: "/patrimonio/itens" },
          { label: "Relatórios", icon: BarChart3, to: "/patrimonio/relatorios" },
        ]}
        kpis={[
          { label: "Total de bens", subtitle: "cadastrados", value: load(aggregates.total.toLocaleString("pt-BR")), icon: Package, tone: "blue", to: "/patrimonio/itens" },
          { label: "Ativos", subtitle: "em operação", value: load((aggregates.byStatus.ativo ?? 0).toLocaleString("pt-BR")), icon: CheckCircle2, tone: "emerald", to: "/patrimonio/itens?status=ativo" },
          { label: "Manutenção", subtitle: "em reparo", value: load((aggregates.byStatus.em_manutencao ?? 0).toLocaleString("pt-BR")), icon: Wrench, tone: "orange", to: "/patrimonio/itens?status=em_manutencao" },
          { label: "Valor total", subtitle: "estimado", value: load(brl(aggregates.totalValue)), icon: DollarSign, tone: "violet", to: "/patrimonio/relatorios" },
        ]}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <QuickAction to="/patrimonio/itens" icon={ListChecks} title="Itens" />
        <QuickAction to="/patrimonio/categorias" icon={FolderTree} title="Categorias" />
        <QuickAction to="/patrimonio/movimentacoes" icon={ArrowLeftRight} title="Movimentações" />
        <QuickAction to="/patrimonio/inventario" icon={ClipboardList} title="Inventário" />
        <QuickAction to="/patrimonio/etiquetas" icon={Tag} title="Etiquetas" />
        <QuickAction to="/patrimonio/importacao" icon={Upload} title="Importação" />
        <QuickAction to="/patrimonio/relatorios" icon={BarChart3} title="Relatórios" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PatrimonyPendingIssues aggregates={aggregates} />
        <PatrimonyRecentMovements />
      </div>
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
