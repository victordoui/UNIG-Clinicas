import { PatrimonyChartCard } from "./PatrimonyChartCard";
import { Layers3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import type { AssetsAggregates } from "@/hooks/useAssets";

const STATUS_COLORS: Record<string, string> = {
  ativo: "#10b981", em_uso: "#3b82f6", em_manutencao: "#f59e0b",
  danificado: "#ef4444", sem_localizacao: "#f97316", baixado: "#71717a",
  reserva: "#64748b", transferido: "#6366f1", extraviado: "#f43f5e", sem: "#cbd5e1",
};
const CONDITION_LABEL: Record<string, string> = {
  novo: "Novo", bom: "Bom", regular: "Regular", ruim: "Ruim", inservivel: "Inservível", sem: "—",
};

export function PatrimonyConditionStatusChart({ aggregates }: { aggregates: AssetsAggregates }) {
  const rows = aggregates.byConditionStatus.map((r: any) => ({ ...r, condition: CONDITION_LABEL[r.condition] ?? r.condition }));
  const statusKeys = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r).filter((k) => k !== "condition")))
  );
  return (
    <PatrimonyChartCard title="Condição × Status" subtitle="Como o estado físico se distribui entre status" icon={Layers3}>
      <div className="h-72">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Sem dados.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="condition" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {statusKeys.map((k) => (
                <Bar key={k} dataKey={k} stackId="a" fill={STATUS_COLORS[k] ?? "#94a3b8"} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </PatrimonyChartCard>
  );
}
