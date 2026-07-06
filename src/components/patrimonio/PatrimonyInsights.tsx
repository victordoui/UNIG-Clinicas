import { PatrimonyChartCard } from "./PatrimonyChartCard";
import { Lightbulb, TrendingUp, Building2, MapPinOff, UserX, DollarSign } from "lucide-react";
import type { AssetsAggregates } from "@/hooks/useAssets";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PatrimonyInsights({ aggregates }: { aggregates: AssetsAggregates }) {
  const top = aggregates.topCategory;
  const topUnit = aggregates.byUnit.filter((u) => u.id !== "__none__")[0];

  const insights = [
    top && {
      icon: TrendingUp,
      text: `Maior concentração de bens está na categoria "${top.name}" (${top.count.toLocaleString("pt-BR")} itens · ${top.pct.toFixed(1)}%).`,
    },
    topUnit && {
      icon: Building2,
      text: `A unidade "${topUnit.name}" concentra ${topUnit.count.toLocaleString("pt-BR")} patrimônios cadastrados.`,
    },
    aggregates.pending.semLocalizacao > 0 && {
      icon: MapPinOff,
      text: `Existem ${aggregates.pending.semLocalizacao.toLocaleString("pt-BR")} bens sem localização definida que precisam de conferência.`,
    },
    aggregates.pending.semResponsavel > 0 && {
      icon: UserX,
      text: `Existem ${aggregates.pending.semResponsavel.toLocaleString("pt-BR")} bens sem responsável informado.`,
    },
    {
      icon: DollarSign,
      text: `O valor total patrimonial registrado é de ${brl(aggregates.totalValue)}.`,
    },
  ].filter(Boolean) as { icon: any; text: string }[];

  return (
    <PatrimonyChartCard title="Resumo gerencial" subtitle="Análises automáticas da base" icon={Lightbulb}>
      <ul className="space-y-2.5">
        {insights.map((i, idx) => (
          <li key={idx} className="flex items-start gap-3 text-sm">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <i.icon className="h-3.5 w-3.5" />
            </div>
            <span className="leading-relaxed">{i.text}</span>
          </li>
        ))}
      </ul>
    </PatrimonyChartCard>
  );
}
