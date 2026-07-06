import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, Calendar, TrendingUp, Package, Truck, Star, PiggyBank, AlertTriangle, Building2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { usePurchaseKpis } from '@/hooks/usePurchaseKpis';
import { useBudgetStatus } from '@/hooks/useBudgets';
import { formatBRL, STATUS_LABEL, type PurchaseStatus } from '@/lib/purchaseLabels';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useMyCostCenters } from '@/hooks/useUserCostCenters';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { canSeeAllCostCenters, visibleCostCenterIds } from '@/lib/ccVisibility';

const PRESETS: Array<{ label: string; days: number }> = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
  { label: '12 meses', days: 365 },
];

const PIE_COLORS = ['hsl(var(--primary))','#10b981','#f59e0b','#ef4444','#6366f1','#06b6d4','#a855f7','#84cc16','#f97316','#0ea5e9'];

function isoStart(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x.toISOString(); }
function isoEnd(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x.toISOString(); }

export default function RelatoriosCompras() {
  const { unigRole, isSuperAdmin, organization } = useAuth();
  const allowed = isSuperAdmin || ['administrador','coordenador_operacoes','gerente_geral','compras','gestor_aprovador'].includes(unigRole);

  const [days, setDays] = useState(30);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0,10));
  const [ccFilter, setCcFilter] = useState<string>('all');
  const [solicitanteFilter, setSolicitanteFilter] = useState<string>('all');

  const range = useMemo(() => ({
    from: isoStart(new Date(from)),
    to: isoEnd(new Date(to)),
  }), [from, to]);

  const { overview, byStatus, byCategory, topSuppliers, series } = usePurchaseKpis(range);
  const { data: budgets = [] } = useBudgetStatus();
  const { data: myCCs = [] } = useMyCostCenters();
  const allowedCCIds = visibleCostCenterIds(unigRole, myCCs);

  // Lightweight client-side dataset for "Gasto por CC" + Solicitante filter.
  const { data: rangeRequests = [], isLoading: loadingCC } = useQuery({
    enabled: !!organization,
    queryKey: ['rel_compras_cc', organization?.organization_id, range, allowedCCIds],
    queryFn: async () => {
      let q = supabase
        .from('purchase_requests')
        .select('id, cost_center_id, solicitante_id, valor_estimado, status, created_at')
        .eq('organization_id', organization!.organization_id)
        .gte('created_at', range.from)
        .lte('created_at', range.to);
      if (allowedCCIds !== null) q = q.in('cost_center_id', allowedCCIds);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Build CC name map (from myCCs + cost_centers fallback).
  const { data: orgCCs = [] } = useQuery({
    enabled: !!organization && canSeeAllCostCenters(unigRole),
    queryKey: ['org_cost_centers_min', organization?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('id, nome')
        .eq('organization_id', organization!.organization_id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const ccNameMap = useMemo(() => {
    const m = new Map<string, string>();
    myCCs.forEach(c => m.set(c.id, c.nome));
    orgCCs.forEach(c => m.set(c.id, c.nome));
    return m;
  }, [myCCs, orgCCs]);

  // Solicitante options derived from current dataset; resolve names via profiles.
  const solicitanteIds = useMemo(
    () => Array.from(new Set(rangeRequests.map(r => r.solicitante_id).filter(Boolean))) as string[],
    [rangeRequests]
  );
  const { data: profiles = [] } = useQuery({
    enabled: solicitanteIds.length > 0,
    queryKey: ['rel_compras_profiles', solicitanteIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', solicitanteIds);
      if (error) throw error;
      return data ?? [];
    },
  });
  const solicitanteName = (id: string) => {
    const p = profiles.find((x: any) => x.id === id);
    return p?.full_name || p?.email || id.slice(0, 8);
  };

  // Apply CC + Solicitante filters for the new section only.
  const filteredCC = useMemo(() => {
    return rangeRequests.filter(r =>
      (ccFilter === 'all' || r.cost_center_id === ccFilter) &&
      (solicitanteFilter === 'all' || r.solicitante_id === solicitanteFilter)
    );
  }, [rangeRequests, ccFilter, solicitanteFilter]);

  const ccChartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredCC) {
      if (!['aprovada','concluida','recebida'].includes(r.status)) continue;
      const k = r.cost_center_id ?? '__none__';
      map.set(k, (map.get(k) ?? 0) + Number(r.valor_estimado ?? 0));
    }
    return Array.from(map.entries())
      .map(([id, valor]) => ({
        cc: id === '__none__' ? 'Sem CC' : (ccNameMap.get(id) ?? id.slice(0, 8)),
        valor,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [filteredCC, ccNameMap]);

  if (!allowed) return <Navigate to="/dashboard" replace />;

  const applyPreset = (n: number) => {
    setDays(n);
    const t = new Date();
    const f = new Date(); f.setDate(f.getDate()-n);
    setFrom(f.toISOString().slice(0,10));
    setTo(t.toISOString().slice(0,10));
  };

  const exportCsv = () => {
    const ov = overview.data;
    const lines = [
      'Indicador;Valor',
      `Solicitações totais;${ov?.solicitacoes_total ?? 0}`,
      `Solicitações abertas;${ov?.solicitacoes_abertas ?? 0}`,
      `Aprovadas;${ov?.aprovadas ?? 0}`,
      `Pedidos emitidos;${ov?.pedidos_emitidos ?? 0}`,
      `Pedidos recebidos;${ov?.pedidos_recebidos ?? 0}`,
      `Valor comprado;${ov?.valor_comprado ?? 0}`,
      `Ticket médio;${(ov?.ticket_medio ?? 0).toFixed(2)}`,
      `Lead time médio (dias);${(ov?.lead_time_medio_dias ?? 0).toFixed(1)}`,
      `% no prazo;${(ov?.pct_no_prazo ?? 0).toFixed(1)}`,
      '',
      'Top fornecedores',
      'Fornecedor;Pedidos;Valor;Nota média;% no prazo',
      ...(topSuppliers.data ?? []).map(s =>
        `${s.nome_fantasia};${s.total_pedidos};${Number(s.valor_total).toFixed(2)};${Number(s.nota_media).toFixed(2)};${Number(s.pct_no_prazo).toFixed(1)}`
      ),
    ];
    const blob = new Blob(['\ufeff'+lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `relatorio-compras-${from}_${to}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const statusData = (byStatus.data ?? []).map(s => ({
    name: STATUS_LABEL[s.status as PurchaseStatus] ?? s.status,
    value: Number(s.total),
  }));

  const categoryData = (byCategory.data ?? []).map(c => ({
    categoria: c.categoria,
    valor: Number(c.valor_total),
  }));

  const seriesData = (series.data ?? []).map(s => ({
    mes: s.mes, Emitidos: Number(s.emitidos), Recebidos: Number(s.recebidos),
  }));

  const ov = overview.data;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" /> Relatórios de Compras</h1>
            <p className="text-sm text-muted-foreground">Indicadores e desempenho do ciclo de compras</p>
          </div>
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> Exportar CSV</Button>
        </div>

        <Card>
          <CardContent className="pt-6 flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <Button key={p.days} size="sm" variant={days === p.days ? 'default' : 'outline'} onClick={() => applyPreset(p.days)}>
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <div><Label className="text-xs">De</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
              <div><Label className="text-xs">Até</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard icon={<Package className="h-4 w-4" />} label="Solicitações abertas" value={ov?.solicitacoes_abertas ?? 0} loading={overview.isLoading} />
          <KpiCard icon={<Truck className="h-4 w-4" />} label="Pedidos no período" value={ov?.pedidos_emitidos ?? 0} loading={overview.isLoading} />
          <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Valor comprado" value={formatBRL(Number(ov?.valor_comprado ?? 0))} loading={overview.isLoading} />
          <KpiCard icon={<Calendar className="h-4 w-4" />} label="Lead time médio" value={`${Number(ov?.lead_time_medio_dias ?? 0).toFixed(1)} d`} loading={overview.isLoading} />
          <KpiCard icon={<Star className="h-4 w-4" />} label="% no prazo" value={`${Number(ov?.pct_no_prazo ?? 0).toFixed(1)}%`} loading={overview.isLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Pedidos emitidos × recebidos</CardTitle></CardHeader>
            <CardContent style={{ height: 280 }}>
              {series.isLoading ? <Skeleton className="h-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={seriesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mes" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Emitidos" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line type="monotone" dataKey="Recebidos" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Distribuição por status</CardTitle></CardHeader>
            <CardContent style={{ height: 280 }}>
              {byStatus.isLoading ? <Skeleton className="h-full" /> : statusData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50} label>
                      {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Valor comprado por categoria</CardTitle></CardHeader>
            <CardContent style={{ height: 280 }}>
              {byCategory.isLoading ? <Skeleton className="h-full" /> : categoryData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="categoria" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v: any) => formatBRL(Number(v))} />
                    <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Top fornecedores</CardTitle></CardHeader>
          <CardContent>
            {topSuppliers.isLoading ? <Skeleton className="h-32" /> : (topSuppliers.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum fornecedor com pedidos no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2">Fornecedor</th>
                      <th className="text-right py-2">Pedidos</th>
                      <th className="text-right py-2">Valor</th>
                      <th className="text-right py-2">Nota média</th>
                      <th className="text-right py-2">% no prazo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(topSuppliers.data ?? []).map(s => (
                      <tr key={s.supplier_id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{s.nome_fantasia}</td>
                        <td className="py-2 text-right">{s.total_pedidos}</td>
                        <td className="py-2 text-right">{formatBRL(Number(s.valor_total))}</td>
                        <td className="py-2 text-right">
                          {Number(s.nota_media) > 0 ? (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                              <Star className="h-3 w-3 mr-1 fill-amber-400 text-amber-400" />
                              {Number(s.nota_media).toFixed(2)}
                            </Badge>
                          ) : '—'}
                        </td>
                        <td className="py-2 text-right">{Number(s.pct_no_prazo).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Gasto por Centro de Custo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Centro de Custo</Label>
                <Select value={ccFilter} onValueChange={setCcFilter}>
                  <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Array.from(ccNameMap.entries()).map(([id, nome]) => (
                      <SelectItem key={id} value={id}>{nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Solicitante</Label>
                <Select value={solicitanteFilter} onValueChange={setSolicitanteFilter}>
                  <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {solicitanteIds.map(id => (
                      <SelectItem key={id} value={id}>{solicitanteName(id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div style={{ height: 280 }}>
              {loadingCC ? <Skeleton className="h-full" /> : ccChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem requisições aprovadas/concluídas no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ccChartData} layout="vertical" margin={{ left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" fontSize={11} tickFormatter={(v) => formatBRL(Number(v))} />
                    <YAxis type="category" dataKey="cc" fontSize={11} width={140} />
                    <Tooltip formatter={(v: any) => formatBRL(Number(v))} />
                    <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0,6,6,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Filtros de Centro de Custo e Solicitante aplicam-se a esta seção. Demais gráficos seguem o intervalo de datas.
            </p>
          </CardContent>
        </Card>

        {budgets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PiggyBank className="h-5 w-5" /> Consumo de orçamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {budgets.map(b => {
                const pct = Number(b.pct_consumido) || 0;
                const exceeded = pct >= 100;
                const alerted = pct >= b.valor_alerta_percent;
                return (
                  <div key={b.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{b.cost_center_nome ?? 'Todos os centros'}</span>
                        {b.category && <Badge variant="outline">{b.category}</Badge>}
                        {exceeded && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Estourado</Badge>}
                        {!exceeded && alerted && <Badge className="bg-amber-500 text-white"><AlertTriangle className="h-3 w-3 mr-1" />Alerta</Badge>}
                      </div>
                      <span className="text-muted-foreground">{b.periodo_inicio} → {b.periodo_fim}</span>
                    </div>
                    <Progress value={Math.min(100, pct)} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatBRL(Number(b.valor_consumido))} de {formatBRL(Number(b.valor_planejado))}</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

function KpiCard({ icon, label, value, loading }: { icon: React.ReactNode; label: string; value: React.ReactNode; loading?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="text-xl font-bold mt-1">{loading ? <Skeleton className="h-7 w-20" /> : value}</div>
      </CardContent>
    </Card>
  );
}
