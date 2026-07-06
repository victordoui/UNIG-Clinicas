import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { BarChart3, AlertTriangle, Calculator, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useStockoutAlerts, usePurchaseSimulations, useBIActions } from '@/hooks/useBIAvancado';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function BIAvancado() {
  const [leadTime, setLeadTime] = useState(7);
  const [sim, setSim] = useState({ nome: '', product_id: '', quantidade: 0, preco_unitario: 0, lead_time_dias: 7 });
  const { organization } = useAuth();
  const orgId = organization?.organization_id;

  const { data: alerts = [], isLoading: loadingAlerts } = useStockoutAlerts(leadTime);
  const { data: sims = [] } = usePurchaseSimulations();
  const { runSimulation } = useBIActions();

  const { data: products = [] } = useQuery({
    queryKey: ['bi_products', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase as any).from('products')
        .select('id, name, category, current_stock, unit_price')
        .eq('organization_id', orgId).order('name').limit(500);
      return data ?? [];
    },
  });

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p: any) => {
      const k = p.category || 'Sem categoria';
      map[k] = (map[k] || 0) + Number(p.current_stock || 0) * Number(p.unit_price || 0);
    });
    return Object.entries(map).map(([categoria, valor]) => ({ categoria, valor: Math.round(valor) }))
      .sort((a, b) => b.valor - a.valor).slice(0, 12);
  }, [products]);

  const criticos = alerts.filter((a) => a.status === 'critico');
  const alerta = alerts.filter((a) => a.status === 'alerta');

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" /> BI Avançado</h1>
          <p className="text-muted-foreground text-sm">Análise determinística com drill-down e simulação de compras</p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="ruptura">Alertas de ruptura</TabsTrigger>
            <TabsTrigger value="simulador">Simulador</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Valor de estoque por categoria</CardTitle></CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={byCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="categoria" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={70} />
                      <YAxis />
                      <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString('pt-BR')}`} />
                      <Bar dataKey="valor" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ruptura" className="space-y-4 mt-4">
            <div className="flex items-end gap-3">
              <div><Label>Lead time (dias)</Label><Input type="number" className="w-28" value={leadTime} onChange={(e) => setLeadTime(+e.target.value || 0)} /></div>
              <Card className="flex-1"><CardContent className="pt-4 flex gap-6">
                <div><p className="text-xs text-muted-foreground">Críticos</p><p className="text-2xl font-bold text-destructive">{criticos.length}</p></div>
                <div><p className="text-xs text-muted-foreground">Em alerta</p><p className="text-2xl font-bold text-orange-500">{alerta.length}</p></div>
              </CardContent></Card>
            </div>
            <Card>
              <CardContent className="p-0">
                {loadingAlerts ? <div className="p-6"><TableSkeleton rows={5} /></div>
                  : alerts.length === 0 ? <EmptyState icon={TrendingDown} title="Sem dados" description="Sem consumo registrado." />
                  : (
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Produto</TableHead><TableHead>Estoque</TableHead><TableHead>Consumo/dia</TableHead>
                        <TableHead>Cobertura (dias)</TableHead><TableHead>Status</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {alerts.filter((a) => a.status !== 'ok' && a.status !== 'sem_consumo').sort((a, b) => Number(a.cobertura_dias) - Number(b.cobertura_dias)).slice(0, 100).map((a) => (
                          <TableRow key={a.product_id}>
                            <TableCell className="font-medium">{a.product_name}</TableCell>
                            <TableCell>{a.current_stock}</TableCell>
                            <TableCell>{Number(a.consumo_diario).toFixed(2)}</TableCell>
                            <TableCell>{Number(a.cobertura_dias).toFixed(1)}</TableCell>
                            <TableCell>
                              <Badge variant={a.status === 'critico' ? 'destructive' : 'secondary'}>
                                <AlertTriangle className="h-3 w-3 mr-1" />{a.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="simulador" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calculator className="h-4 w-4" /> Simulador de compra</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div><Label>Cenário</Label><Input value={sim.nome} onChange={(e) => setSim({ ...sim, nome: e.target.value })} /></div>
                <div><Label>Produto</Label>
                  <Select value={sim.product_id} onValueChange={(v) => setSim({ ...sim, product_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{products.slice(0, 200).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Quantidade</Label><Input type="number" value={sim.quantidade} onChange={(e) => setSim({ ...sim, quantidade: +e.target.value })} /></div>
                <div><Label>Preço unit.</Label><Input type="number" step="0.01" value={sim.preco_unitario} onChange={(e) => setSim({ ...sim, preco_unitario: +e.target.value })} /></div>
                <div><Label>Lead time</Label><Input type="number" value={sim.lead_time_dias} onChange={(e) => setSim({ ...sim, lead_time_dias: +e.target.value })} /></div>
                <div className="md:col-span-5">
                  <Button onClick={() => runSimulation.mutate(sim)} disabled={!sim.nome || !sim.product_id || runSimulation.isPending}>
                    <Calculator className="h-4 w-4 mr-2" /> Executar simulação
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Histórico</CardTitle></CardHeader>
              <CardContent className="p-0">
                {sims.length === 0 ? <EmptyState icon={Calculator} title="Nenhuma simulação" description="Execute um cenário acima." />
                  : (
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Cenário</TableHead><TableHead>Produto</TableHead><TableHead>Qtd</TableHead>
                        <TableHead>Custo total</TableHead><TableHead>Novo estoque</TableHead><TableHead>Cobertura</TableHead><TableHead>Entrega</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {sims.map((s: any) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.nome}</TableCell>
                            <TableCell>{s.products?.name ?? '—'}</TableCell>
                            <TableCell>{s.quantidade}</TableCell>
                            <TableCell>R$ {Number(s.resultado?.custo_total ?? 0).toLocaleString('pt-BR')}</TableCell>
                            <TableCell>{s.resultado?.novo_estoque}</TableCell>
                            <TableCell>{s.resultado?.cobertura_dias ?? '—'} d</TableCell>
                            <TableCell className="text-xs">{s.resultado?.previsao_entrega}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
