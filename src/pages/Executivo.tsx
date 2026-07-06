import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePurchaseKpis } from "@/hooks/usePurchaseKpis";
import { useAccountsPayableSummary } from "@/hooks/useAccountsPayable";
import { TrendingUp, Truck, Wallet, Clock, CheckCircle2, LineChart as LineChartIcon } from "lucide-react";
import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from "recharts";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

export default function ExecutiveDashboard() {
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 11);
    from.setDate(1);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const { overview, series } = usePurchaseKpis(range);
  const summary = useAccountsPayableSummary();

  const kpis = [
    { label: "Valor comprado (12m)", value: formatCurrency(overview.data?.valor_comprado ?? 0), icon: TrendingUp },
    { label: "Pedidos emitidos", value: overview.data?.pedidos_emitidos ?? 0, icon: Truck },
    { label: "Lead time médio", value: `${(overview.data?.lead_time_medio_dias ?? 0).toFixed(1)} d`, icon: Clock },
    { label: "% no prazo", value: `${(overview.data?.pct_no_prazo ?? 0).toFixed(1)}%`, icon: CheckCircle2 },
    { label: "A pagar (pendente)", value: formatCurrency(summary.data?.total_pendente ?? 0), icon: Wallet },
    { label: "Vencido", value: formatCurrency(summary.data?.total_vencido ?? 0), icon: Wallet },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><LineChartIcon className="h-6 w-6 text-primary" /> Dashboard Executivo</h1>
          <p className="text-muted-foreground mt-1">Visão consolidada dos últimos 12 meses.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <Card key={k.label} className="animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Pedidos × Recebimentos</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="emitidos" stroke="hsl(var(--primary))" name="Emitidos" />
                  <Line type="monotone" dataKey="recebidos" stroke="hsl(var(--accent))" name="Recebidos" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Compras por mês</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="emitidos" fill="hsl(var(--primary))" name="Pedidos emitidos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
