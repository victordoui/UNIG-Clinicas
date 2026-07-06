import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { useCashFlowProjection, useAccountsPayableSummary } from '@/hooks/useAccountsPayable';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Line, ComposedChart } from 'recharts';

const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export default function FluxoCaixa() {
  const [dias, setDias] = useState(30);
  const { data: rows = [], isLoading } = useCashFlowProjection(dias);
  const { data: summary } = useAccountsPayableSummary();

  let acc = 0;
  const chartData = rows.map(r => {
    acc += Number(r.valor_a_pagar);
    return { dia: fmtDate(r.dia), valor: Number(r.valor_a_pagar), acumulado: acc };
  });

  const totalProjetado = rows.reduce((s, r) => s + Number(r.valor_a_pagar), 0);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" /> Fluxo de Caixa
            </h1>
            <p className="text-muted-foreground mt-1">Projeção de saídas para os próximos dias.</p>
          </div>
          <Select value={String(dias)} onValueChange={v => setDias(Number(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Próximos 7 dias</SelectItem>
              <SelectItem value="30">Próximos 30 dias</SelectItem>
              <SelectItem value="60">Próximos 60 dias</SelectItem>
              <SelectItem value="90">Próximos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total projetado ({dias} dias)</p>
            <p className="text-2xl font-bold">{fmt(totalProjetado)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Vencidas (pendente)</p>
            <p className="text-2xl font-bold text-destructive">{fmt(summary?.total_vencido || 0)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Vence em 7 dias</p>
            <p className="text-2xl font-bold text-warning">{fmt(summary?.vence_7_dias || 0)}</p>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Projeção diária</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground">Carregando…</div>
            ) : (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="dia" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Bar dataKey="valor" name="A pagar no dia" fill="hsl(var(--primary))" />
                    <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Detalhe por dia</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Qtd. contas</TableHead><TableHead className="text-right">Valor</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.filter(r => Number(r.qtd) > 0).map(r => (
                  <TableRow key={r.dia}>
                    <TableCell>{new Date(r.dia).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{r.qtd}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(Number(r.valor_a_pagar))}</TableCell>
                  </TableRow>
                ))}
                {rows.filter(r => Number(r.qtd) > 0).length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Nenhum compromisso no período.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
