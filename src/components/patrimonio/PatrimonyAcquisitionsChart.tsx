import { PatrimonyChartCard } from "./PatrimonyChartCard";
import { CalendarClock } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { AssetsAggregates } from "@/hooks/useAssets";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function PatrimonyAcquisitionsChart({ aggregates }: { aggregates: AssetsAggregates }) {
  const data = aggregates.byAcquisitionYear.filter((d) => d.year !== "Sem data");
  return (
    <PatrimonyChartCard title="Aquisições por ano" subtitle="Evolução da base patrimonial" icon={CalendarClock}>
      <div className="h-72">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Sem datas de aquisição registradas.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => brl(Number(v))} />
              <Tooltip formatter={(v: any, n: any) => n === "value" ? [brl(Number(v)), "Valor"] : [Number(v).toLocaleString("pt-BR"), "Qtd"]} />
              <Line yAxisId="left" type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Qtd" />
              <Line yAxisId="right" type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Valor" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </PatrimonyChartCard>
  );
}
