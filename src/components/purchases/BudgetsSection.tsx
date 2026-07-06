import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, PiggyBank, Save, X, AlertTriangle } from 'lucide-react';
import { isStaff } from '@/lib/unigRoles';
import { useBudgets, useBudgetStatus, useUpsertBudget, useDeleteBudget, type Budget } from '@/hooks/useBudgets';
import { useCostCenters } from '@/hooks/useCostCenters';
import { formatBRL } from '@/lib/purchaseLabels';
import { format } from 'date-fns';

export function BudgetsSection() {
  const { unigRole } = useAuth();
  const { toast } = useToast();
  const canManage = isStaff(unigRole);
  const { data: budgets = [], isLoading } = useBudgets();
  const { data: status = [] } = useBudgetStatus();
  const { data: centers = [] } = useCostCenters();
  const upsert = useUpsertBudget();
  const del = useDeleteBudget();
  const [editing, setEditing] = useState<Partial<Budget> | null>(null);

  if (!canManage) {
    return (
      <Card><CardContent className="py-10 text-center text-muted-foreground">
        Apenas administradores e gerentes podem gerenciar orçamentos.
      </CardContent></Card>
    );
  }

  const startNew = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setEditing({
      cost_center_id: null, category: null,
      periodo_inicio: format(start, 'yyyy-MM-dd'),
      periodo_fim: format(end, 'yyyy-MM-dd'),
      valor_planejado: 0, valor_alerta_percent: 80, ativo: true,
    });
  };

  const save = async () => {
    if (!editing?.periodo_inicio || !editing?.periodo_fim || !editing?.valor_planejado) {
      return toast({ title: 'Preencha período e valor', variant: 'destructive' });
    }
    await upsert.mutateAsync(editing);
    setEditing(null);
  };

  const statusFor = (id: string) => status.find(s => s.id === id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><PiggyBank className="h-5 w-5" /> Orçamentos</CardTitle>
          {!editing && <Button size="sm" onClick={startNew}><Plus className="h-4 w-4 mr-2" />Novo</Button>}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Defina limites planejados por centro de custo e/ou categoria. O consumo é calculado a partir dos pedidos emitidos no período.
          </p>

          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
              <div>
                <label className="text-xs text-muted-foreground">Centro de custo (opcional)</label>
                <Select value={editing.cost_center_id ?? '__none__'} onValueChange={v => setEditing({ ...editing, cost_center_id: v === '__none__' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Todos os centros</SelectItem>
                    {centers.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Categoria (opcional)</label>
                <Input value={editing.category ?? ''} onChange={e => setEditing({ ...editing, category: e.target.value || null })} placeholder="Ex.: TI, Limpeza" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Valor planejado (R$) *</label>
                <Input type="number" step="0.01" value={editing.valor_planejado ?? ''} onChange={e => setEditing({ ...editing, valor_planejado: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Início *</label>
                <Input type="date" value={editing.periodo_inicio ?? ''} onChange={e => setEditing({ ...editing, periodo_inicio: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fim *</label>
                <Input type="date" value={editing.periodo_fim ?? ''} onChange={e => setEditing({ ...editing, periodo_fim: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Alertar em (%)</label>
                <Input type="number" min={0} max={100} value={editing.valor_alerta_percent ?? 80} onChange={e => setEditing({ ...editing, valor_alerta_percent: Number(e.target.value) })} />
              </div>
              <div className="md:col-span-3 flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4 mr-2" />Cancelar</Button>
                <Button onClick={save} disabled={upsert.isPending}><Save className="h-4 w-4 mr-2" />Salvar</Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-6 text-muted-foreground">Carregando…</div>
          ) : budgets.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">Nenhum orçamento configurado.</div>
          ) : (
            <div className="space-y-3">
              {budgets.map(b => {
                const s = statusFor(b.id);
                const pct = s?.pct_consumido ?? 0;
                const alerted = pct >= b.valor_alerta_percent;
                const exceeded = pct >= 100;
                const cc = centers.find(c => c.id === b.cost_center_id);
                return (
                  <div key={b.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          {cc ? `${cc.codigo} — ${cc.nome}` : 'Todos os centros'}
                          {b.category && <Badge variant="outline">{b.category}</Badge>}
                          {!b.ativo && <Badge variant="secondary">Inativo</Badge>}
                          {exceeded && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Estourado</Badge>}
                          {!exceeded && alerted && <Badge className="bg-amber-500 text-white"><AlertTriangle className="h-3 w-3 mr-1" />Alerta</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {b.periodo_inicio} → {b.periodo_fim}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditing(b)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => del.mutate(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                    <Progress value={Math.min(100, pct)} className={exceeded ? 'bg-destructive/20' : ''} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatBRL(s?.valor_consumido ?? 0)} de {formatBRL(b.valor_planejado)}</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
