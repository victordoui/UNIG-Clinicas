import { Package, CheckCircle2, Activity, Wrench, AlertTriangle, MapPinOff, Archive, DollarSign } from "lucide-react";
import { useAssetsAggregates, type AssetFilters } from "@/hooks/useAssets";
import { PatrimonyKpiCard } from "./PatrimonyKpiCard";

interface Props {
  filters?: AssetFilters;
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function AssetSummaryCards({ filters }: Props) {
  const { aggregates: a } = useAssetsAggregates(filters ?? {});
  const total = a.total || 0;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);

  const cards = [
    { label: "Total", value: total.toLocaleString("pt-BR"), icon: Package, tone: "primary" as const, hint: "Bens registrados no sistema" },
    { label: "Ativos", value: (a.byStatus.ativo ?? 0).toLocaleString("pt-BR"), icon: CheckCircle2, tone: "success" as const, pct: pct(a.byStatus.ativo ?? 0) },
    { label: "Em uso", value: (a.byStatus.em_uso ?? 0).toLocaleString("pt-BR"), icon: Activity, tone: "info" as const, pct: pct(a.byStatus.em_uso ?? 0) },
    { label: "Em manutenção", value: (a.byStatus.em_manutencao ?? 0).toLocaleString("pt-BR"), icon: Wrench, tone: "warning" as const },
    { label: "Danificados", value: (a.byStatus.danificado ?? 0).toLocaleString("pt-BR"), icon: AlertTriangle, tone: "danger" as const },
    { label: "Sem localização", value: a.pending.semLocalizacao.toLocaleString("pt-BR"), icon: MapPinOff, tone: "warning" as const, hint: "Requer conferência" },
    { label: "Baixados", value: (a.byStatus.baixado ?? 0).toLocaleString("pt-BR"), icon: Archive, tone: "neutral" as const },
    { label: "Valor total", value: brl(a.totalValue), icon: DollarSign, tone: "finance" as const, hint: "Valor patrimonial estimado" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8 gap-3">
      {cards.map((c) => (
        <PatrimonyKpiCard key={c.label} {...c} />
      ))}
    </div>
  );
}
