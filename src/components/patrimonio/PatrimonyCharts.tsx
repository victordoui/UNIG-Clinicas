import { PatrimonyChartCard } from "./PatrimonyChartCard";
import { BarChart3, PieChart as PieIcon, Building2, Gauge, DollarSign } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import type { AssetsAggregates } from "@/hooks/useAssets";
import * as LucideIcons from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  ativo: "#10b981",
  em_uso: "#3b82f6",
  em_manutencao: "#f59e0b",
  danificado: "#ef4444",
  sem_localizacao: "#f97316",
  baixado: "#71717a",
  reserva: "#64748b",
  transferido: "#6366f1",
  extraviado: "#f43f5e",
};
const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo", em_uso: "Em uso", em_manutencao: "Manutenção",
  danificado: "Danificado", sem_localizacao: "Sem localização",
  baixado: "Baixado", reserva: "Reserva", transferido: "Transferido", extraviado: "Extraviado",
};
const CONDITION_LABEL: Record<string, string> = {
  novo: "Novo", bom: "Bom", regular: "Regular", ruim: "Ruim", inservivel: "Inservível",
};
const CONDITION_COLORS: Record<string, string> = {
  novo: "#10b981", bom: "#3b82f6", regular: "#f59e0b", ruim: "#f97316", inservivel: "#ef4444",
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function CategoryDistributionChart({ aggregates }: { aggregates: AssetsAggregates }) {
  const data = aggregates.byCategory.slice(0, 10).map((c) => ({ name: c.name, count: c.count, pct: c.pct }));
  return (
    <PatrimonyChartCard title="Distribuição por categoria" subtitle="Top 10 categorias por quantidade" icon={BarChart3}>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any, _n: any, p: any) => [`${v} (${p.payload.pct.toFixed(1)}%)`, "Qtd"]} />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PatrimonyChartCard>
  );
}

export function ValueByCategoryChart({ aggregates }: { aggregates: AssetsAggregates }) {
  const data = [...aggregates.byCategory].sort((a, b) => b.value - a.value).slice(0, 10)
    .map((c) => ({ name: c.name, value: c.value }));
  return (
    <PatrimonyChartCard title="Valor patrimonial por categoria" subtitle="Top 10 categorias por valor R$" icon={DollarSign}>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => [brl(Number(v)), "Valor"]} />
            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PatrimonyChartCard>
  );
}

export function StatusDonutChart({ aggregates }: { aggregates: AssetsAggregates }) {
  const data = Object.entries(aggregates.byStatus)
    .map(([k, v]) => ({ name: STATUS_LABEL[k] ?? k, key: k, value: v }))
    .filter((d) => d.value > 0);
  return (
    <PatrimonyChartCard title="Situação dos bens" subtitle="Distribuição por status" icon={PieIcon}>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
              {data.map((d) => <Cell key={d.key} fill={STATUS_COLORS[d.key] ?? "#94a3b8"} />)}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </PatrimonyChartCard>
  );
}

export function ConditionChart({ aggregates }: { aggregates: AssetsAggregates }) {
  const data = Object.entries(aggregates.byCondition)
    .map(([k, v]) => ({ name: CONDITION_LABEL[k] ?? k, key: k, count: v }))
    .filter((d) => d.count > 0);
  return (
    <PatrimonyChartCard title="Condição dos bens" subtitle="Distribuição por condição física" icon={Gauge}>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((d) => <Cell key={d.key} fill={CONDITION_COLORS[d.key] ?? "#94a3b8"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PatrimonyChartCard>
  );
}

export function UnitRankingChart({ aggregates }: { aggregates: AssetsAggregates }) {
  const data = aggregates.byUnit.filter((u) => u.id !== "__none__");
  if (data.length === 0) {
    return (
      <PatrimonyChartCard title="Patrimônio por unidade" icon={Building2}>
        <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma unidade com patrimônio.</p>
      </PatrimonyChartCard>
    );
  }
  if (data.length === 1) {
    const u = data[0];
    return (
      <PatrimonyChartCard title="Patrimônio por unidade" icon={Building2}>
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Todos os bens estão em</p>
              <p className="text-lg font-bold">{u.name}</p>
              <p className="text-xs text-muted-foreground">
                {u.count.toLocaleString("pt-BR")} patrimônios · {brl(u.value)}
              </p>
            </div>
          </div>
        </div>
      </PatrimonyChartCard>
    );
  }
  return (
    <PatrimonyChartCard title="Patrimônio por unidade" subtitle="Ranking por quantidade" icon={Building2}>
      <ul className="space-y-2">
        {data.map((u, i) => (
          <li key={u.id}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="truncate">{u.name}</span>
              </span>
              <span className="font-semibold tabular-nums">{u.count.toLocaleString("pt-BR")}</span>
            </div>
            <div className="h-1.5 bg-muted rounded overflow-hidden">
              <div className="h-full bg-primary rounded" style={{ width: `${u.pct}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </PatrimonyChartCard>
  );
}
