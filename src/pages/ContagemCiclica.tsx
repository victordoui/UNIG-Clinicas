import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardCheck, RefreshCw, Plus, ListChecks, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useCycleCountDashboard, useCycleCountPlans, useCycleCountTasks, useCycleCountActions } from '@/hooks/useCycleCount';

export default function ContagemCiclica() {
  const [status, setStatus] = useState('pendente');
  const [planOpen, setPlanOpen] = useState(false);
  const [countOpen, setCountOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [qtd, setQtd] = useState('');
  const [obs, setObs] = useState('');
  const [planForm, setPlanForm] = useState({ nome: '', freq_a_dias: 30, freq_b_dias: 90, freq_c_dias: 180, tolerancia_percent: 2 });

  const { data: dash } = useCycleCountDashboard();
  const { data: plans = [] } = useCycleCountPlans();
  const { data: tasks = [], isLoading } = useCycleCountTasks(status);
  const { recalcABC, createPlan, generateTasks, submitCount } = useCycleCountActions();

  const tolerancia = plans[0]?.tolerancia_percent ?? 2;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-primary" /> Contagem Cíclica</h1>
            <p className="text-muted-foreground text-sm">Contagens periódicas por curva ABC</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => recalcABC.mutate()} disabled={recalcABC.isPending}>
              <RefreshCw className="h-4 w-4 mr-2" /> Recalcular ABC
            </Button>
            <Button onClick={() => setPlanOpen(true)}><Plus className="h-4 w-4 mr-2" /> Novo plano</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { l: 'Pendentes', v: dash?.pendentes ?? 0, icon: ListChecks },
            { l: 'Hoje', v: dash?.contadas_hoje ?? 0, icon: CheckCircle2 },
            { l: 'Divergentes', v: dash?.divergentes ?? 0, icon: AlertTriangle },
            { l: 'Aprovadas/mês', v: dash?.aprovadas_mes ?? 0, icon: CheckCircle2 },
            { l: 'Curva A', v: dash?.curva_a ?? 0 },
            { l: 'Curva B', v: dash?.curva_b ?? 0 },
            { l: 'Curva C', v: dash?.curva_c ?? 0 },
          ].map((s) => (
            <Card key={s.l}><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{s.l}</p>
              <p className="text-2xl font-bold">{Number(s.v)}</p>
            </CardContent></Card>
          ))}
        </div>

        {plans.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Planos ativos</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {plans.map((p) => (
                <div key={p.id} className="flex items-center gap-2 border rounded-md px-3 py-1.5 text-sm">
                  <span className="font-medium">{p.nome}</span>
                  <span className="text-muted-foreground">A:{p.freq_a_dias}d B:{p.freq_b_dias}d C:{p.freq_c_dias}d</span>
                  <Button size="sm" variant="ghost" onClick={() => generateTasks.mutate(p.id)}>Gerar tarefas</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="pendente">Pendentes</TabsTrigger>
            <TabsTrigger value="contada">Contadas</TabsTrigger>
            <TabsTrigger value="divergente">Divergentes</TabsTrigger>
            <TabsTrigger value="aprovada">Aprovadas</TabsTrigger>
            <TabsTrigger value="todos">Todas</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardContent className="p-0">
            {isLoading ? <div className="p-6"><TableSkeleton rows={6} /></div>
              : tasks.length === 0 ? <EmptyState icon={ClipboardCheck} title="Nenhuma tarefa" description="Crie um plano e gere tarefas para iniciar." />
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Produto</TableHead><TableHead>SKU</TableHead><TableHead>Curva</TableHead>
                    <TableHead>Esperada</TableHead><TableHead>Contada</TableHead><TableHead>Diverg.</TableHead>
                    <TableHead>Status</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {tasks.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.products?.name ?? '—'}</TableCell>
                        <TableCell className="text-xs">{t.products?.sku ?? '—'}</TableCell>
                        <TableCell><Badge variant="outline">{t.curva ?? 'C'}</Badge></TableCell>
                        <TableCell>{t.qtd_esperada}</TableCell>
                        <TableCell>{t.qtd_contada ?? '—'}</TableCell>
                        <TableCell>{t.divergencia ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={t.status === 'aprovada' ? 'default' : t.status === 'divergente' ? 'destructive' : 'secondary'}>
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {t.status === 'pendente' && (
                            <Button size="sm" onClick={() => { setSelected(t); setQtd(String(t.qtd_esperada)); setObs(''); setCountOpen(true); }}>Contar</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo plano de contagem</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={planForm.nome} onChange={(e) => setPlanForm({ ...planForm, nome: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Freq A (dias)</Label><Input type="number" value={planForm.freq_a_dias} onChange={(e) => setPlanForm({ ...planForm, freq_a_dias: +e.target.value })} /></div>
              <div><Label>Freq B (dias)</Label><Input type="number" value={planForm.freq_b_dias} onChange={(e) => setPlanForm({ ...planForm, freq_b_dias: +e.target.value })} /></div>
              <div><Label>Freq C (dias)</Label><Input type="number" value={planForm.freq_c_dias} onChange={(e) => setPlanForm({ ...planForm, freq_c_dias: +e.target.value })} /></div>
            </div>
            <div><Label>Tolerância (%)</Label><Input type="number" step="0.1" value={planForm.tolerancia_percent} onChange={(e) => setPlanForm({ ...planForm, tolerancia_percent: +e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>Cancelar</Button>
            <Button onClick={() => createPlan.mutate(planForm, { onSuccess: () => setPlanOpen(false) })} disabled={!planForm.nome}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={countOpen} onOpenChange={setCountOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Contar: {selected?.products?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Esperado: <strong>{selected?.qtd_esperada}</strong> · Tolerância: ±{tolerancia}%</p>
            <div><Label>Quantidade contada</Label><Input type="number" value={qtd} onChange={(e) => setQtd(e.target.value)} /></div>
            <div><Label>Observação</Label><Input value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCountOpen(false)}>Cancelar</Button>
            <Button onClick={() => submitCount.mutate({ taskId: selected.id, qtd: +qtd, observacao: obs, tolerancia }, { onSuccess: () => setCountOpen(false) })}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
