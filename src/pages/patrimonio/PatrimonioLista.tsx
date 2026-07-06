import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Package, Plus, ArrowLeftRight, ClipboardList, Upload, Tag, BarChart3,
  FolderTree, ListChecks,
} from "lucide-react";
import { useAssetsAggregates } from "@/hooks/useAssets";
import { AssetSummaryCards } from "@/components/patrimonio/AssetSummaryCards";
import {
  CategoryDistributionChart, ValueByCategoryChart, StatusDonutChart,
  ConditionChart, UnitRankingChart,
} from "@/components/patrimonio/PatrimonyCharts";
import { PatrimonyPendingIssues } from "@/components/patrimonio/PatrimonyPendingIssues";
import { PatrimonyRecentMovements } from "@/components/patrimonio/PatrimonyRecentMovements";
import { PatrimonyInsights } from "@/components/patrimonio/PatrimonyInsights";
import { CategorySummaryTable, UnitSummaryTable } from "@/components/patrimonio/PatrimonySummaryTable";

export default function PatrimonioLista() {
  const nav = useNavigate();
  const { aggregates } = useAssetsAggregates({});

  const shortcuts = [
    { label: "Itens do Patrimônio", icon: ListChecks, to: "/patrimonio/itens" },
    { label: "Categorias", icon: FolderTree, to: "/patrimonio/categorias" },
    { label: "Movimentações", icon: ArrowLeftRight, to: "/patrimonio/movimentacoes" },
    { label: "Inventário", icon: ClipboardList, to: "/patrimonio/inventario" },
    { label: "Etiquetas", icon: Tag, to: "/patrimonio/etiquetas" },
    { label: "Importação", icon: Upload, to: "/patrimonio/importacao" },
    { label: "Relatórios", icon: BarChart3, to: "/patrimonio/relatorios" },
  ];

  return (
    <MainLayout>
      <div className="space-y-5 p-4 md:p-6">
        <PageHeader
          icon={Package}
          title="Painel de Patrimônio"
          description="Visão consolidada da base patrimonial da instituição, com indicadores, pendências e análises rápidas."
          actions={
            <Button onClick={() => nav("/patrimonio/novo")} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Patrimônio
            </Button>
          }
        />

        <div className="flex flex-wrap gap-2">
          {shortcuts.map((s) => (
            <Button key={s.to} variant="outline" size="sm" onClick={() => nav(s.to)} className="gap-2">
              <s.icon className="h-4 w-4" /> {s.label}
            </Button>
          ))}
        </div>

        <AssetSummaryCards filters={{}} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CategoryDistributionChart aggregates={aggregates} />
          <StatusDonutChart aggregates={aggregates} />
          <ValueByCategoryChart aggregates={aggregates} />
          <ConditionChart aggregates={aggregates} />
          <UnitRankingChart aggregates={aggregates} />
          <PatrimonyInsights aggregates={aggregates} />
          <PatrimonyPendingIssues aggregates={aggregates} />
          <PatrimonyRecentMovements />
          <CategorySummaryTable aggregates={aggregates} />
          <UnitSummaryTable aggregates={aggregates} />
        </div>
      </div>
    </MainLayout>
  );
}

