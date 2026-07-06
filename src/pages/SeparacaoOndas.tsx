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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Plus, Play, CheckCircle2 } from 'lucide-react';
import { usePickingWaves, usePickingWavesDashboard, usePickingWaveItems, usePickingWaveActions, type PickingWave } from '@/hooks/usePickingWaves';

export default function SeparacaoOndas() {
  const [status, setStatus] = useState('todos');
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<PickingWave | null>(null);
  const [form, setForm] = useState({ numero: '', observacoes: '' });
  const [itemForm, setItemForm] = useState({ descricao: '', qtd_solicitada: 1 });

  const { data: dash } = usePickingWavesDashboard();
  const { data: waves = [], isLoading } = usePickingWaves(status);
  const { data: items = [] } = usePickingWaveItems(selected?.id ?? null);
  const { createWave, addItem, updateItem, setStatus: setWaveStatus } = usePickingWaveActions();

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /> Separação por Ondas</h1>
            <p className="text-muted-foreground text-sm">Picking agrupado por rota</p>
          </div>
          <Button onClick={() => { setForm({ numero: `ONDA-${Date.now().toString().slice(-6)}`, observacoes: '' }); setNewOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova onda
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { l: 'Abertas', v: dash?.abertas ?? 0 },
            { l: 'Separando', v: dash?.separando ?? 0 },
            { l: 'Concluídas hoje', v: dash?.concluidas_hoje ?? 0 },
            { l: 'Itens pendentes', v: dash?.itens_pendentes ?? 0 },
          ].map((s) => (
            <Card key={s.l}><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{s.l}</p>
              <p className="text-2xl font-bold">{Number(s.v)}</p>
            </CardContent></Card>
          ))}
        </div>

        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="todos">Todas</TabsTrigger>
            <TabsTrigger value="aberta">Abertas</TabsTrigger>
            <TabsTrigger value="separando">Separando</TabsTrigger>
            <TabsTrigger value="concluida">Concluídas</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardContent className="p-0">
            {isLoading ? <div className="p-6"><TableSkeleton rows={6} /></div>
              : waves.length === 0 ? <EmptyState icon={Truck} title="Nenhuma onda" description="Crie uma onda para começar." />
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Número</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead>
                    <TableHead>Observações</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {waves.map((w) => (
                      <TableRow key={w.id} className="cursor-pointer" onClick={() => setSelected(w)}>
                        <TableCell className="font-medium">{w.numero}</TableCell>
                        <TableCell>{new Date(w.data_onda).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell><Badge>{w.status}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{w.observacoes ?? '—'}</TableCell>
                        <TableCell>
                          {w.status === 'aberta' && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setWaveStatus.mutate({ id: w.id, status: 'separando' }); }}><Play className="h-3.5 w-3.5 mr-1" />Iniciar</Button>}
                          {w.status === 'separando' && <Button size="sm" onClick={(e) => { e.stopPropagation(); setWaveStatus.mutate({ id: w.id, status: 'concluida' }); }}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Concluir</Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova onda de separação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Número</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
            <div><Label>Observações</Label><Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button onClick={() => createWave.mutate(form, { onSuccess: () => setNewOpen(false) })}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>{selected?.numero}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1"><Label>Descrição do item</Label><Input value={itemForm.descricao} onChange={(e) => setItemForm({ ...itemForm, descricao: e.target.value })} /></div>
              <div className="w-24"><Label>Qtd</Label><Input type="number" value={itemForm.qtd_solicitada} onChange={(e) => setItemForm({ ...itemForm, qtd_solicitada: +e.target.value })} /></div>
              <Button onClick={() => { if (!selected || !itemForm.descricao) return; addItem.mutate({ wave_id: selected.id, ...itemForm }); setItemForm({ descricao: '', qtd_solicitada: 1 }); }}>Adicionar</Button>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Solic.</TableHead><TableHead>Separ.</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.descricao}</TableCell>
                    <TableCell>{i.qtd_solicitada}</TableCell>
                    <TableCell>
                      <Input className="w-20 h-8" type="number" defaultValue={i.qtd_separada}
                        onBlur={(e) => updateItem.mutate({ id: i.id, qtd_separada: +e.target.value })} />
                    </TableCell>
                    <TableCell><Badge variant={i.status === 'separado' ? 'default' : 'secondary'}>{i.status}</Badge></TableCell>
                    <TableCell>
                      {i.status === 'pendente' && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => updateItem.mutate({ id: i.id, status: 'separado', separado_em: new Date().toISOString() })}>OK</Button>
                          <Button size="sm" variant="ghost" onClick={() => updateItem.mutate({ id: i.id, status: 'falta' })}>Falta</Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
