import { useState } from 'react';
import {
  useApprovalWorkflows,
  useApprovalWorkflowSteps,
  useSaveWorkflow,
  useDeleteWorkflow,
  type ApprovalWorkflow,
  type ApprovalWorkflowStep,
} from '@/hooks/useApprovalWorkflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, ArrowUp, ArrowDown, Settings2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';

const PAPEIS = ['administrador', 'gestor_aprovador', 'compras', 'almoxarifado'];

export function ConfiguracaoAprovacoesContent({ embedded = false }: { embedded?: boolean } = {}) {
  const { data: workflows, isLoading } = useApprovalWorkflows();
  const save = useSaveWorkflow();
  const remove = useDeleteWorkflow();
  const [editing, setEditing] = useState<{ wf: Partial<ApprovalWorkflow>; steps: Partial<ApprovalWorkflowStep>[] } | null>(null);

  const openNew = () =>
    setEditing({
      wf: { nome: '', referencia_tipo: 'purchase_request', valor_min: 0, prioridade: 100, ativo: true },
      steps: [{ ordem: 1, nome: 'Aprovação', tipo: 'unico', sla_horas: 48, aprovador_papel: 'administrador' }],
    });

  return (
    <div className={embedded ? "space-y-6 animate-fade-in" : "container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-6 animate-fade-in"}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={embedded ? "text-xl font-semibold flex items-center gap-2" : "text-2xl md:text-3xl font-bold flex items-center gap-2"}>
            <Settings2 className={embedded ? "h-5 w-5 text-primary" : "h-6 w-6 text-primary"} />
            Fluxos de Aprovação
          </h1>
          <p className="text-sm text-muted-foreground">Configure cadeias de aprovação por valor, categoria e centro de custo</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo fluxo</Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando…</CardContent></Card>
      ) : !workflows?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum fluxo cadastrado</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {workflows.map((wf) => (
            <WorkflowRow key={wf.id} wf={wf} onEdit={(steps) => setEditing({ wf, steps })} onDelete={() => remove.mutate(wf.id)} />
          ))}
        </div>
      )}

      {editing && (
        <WorkflowEditor
          state={editing}
          setState={setEditing}
          onSave={async () => {
            await save.mutateAsync({ workflow: editing.wf, steps: editing.steps });
            setEditing(null);
          }}
          saving={save.isPending}
        />
      )}
    </div>
  );
}

export default function ConfiguracaoAprovacoes() {
  return (
    <MainLayout>
      <ConfiguracaoAprovacoesContent />
    </MainLayout>
  );
}

function WorkflowRow({ wf, onEdit, onDelete }: { wf: ApprovalWorkflow; onEdit: (steps: ApprovalWorkflowStep[]) => void; onDelete: () => void }) {
  const { data: steps } = useApprovalWorkflowSteps(wf.id);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            {wf.nome}
            {!wf.ativo && <Badge variant="outline">Inativo</Badge>}
            <Badge variant="secondary">{wf.referencia_tipo === 'purchase_request' ? 'Solicitação' : 'Pedido'}</Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(steps ?? [])}>Editar</Button>
            <Button size="sm" variant="ghost" onClick={() => { if (confirm('Remover fluxo?')) onDelete(); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <p>
          Faixa: {Number(wf.valor_min ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          {wf.valor_max != null && ` até ${Number(wf.valor_max).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
          {' · '}Prioridade {wf.prioridade}
          {' · '}{steps?.length ?? 0} etapa(s)
        </p>
      </CardContent>
    </Card>
  );
}

function WorkflowEditor({
  state, setState, onSave, saving,
}: {
  state: { wf: Partial<ApprovalWorkflow>; steps: Partial<ApprovalWorkflowStep>[] };
  setState: (s: any) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const { wf, steps } = state;

  const updateStep = (i: number, patch: Partial<ApprovalWorkflowStep>) => {
    const next = steps.slice();
    next[i] = { ...next[i], ...patch };
    setState({ ...state, steps: next });
  };
  const moveStep = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = steps.slice();
    [next[i], next[j]] = [next[j], next[i]];
    next.forEach((s, idx) => (s.ordem = idx + 1));
    setState({ ...state, steps: next });
  };
  const removeStep = (i: number) => {
    const next = steps.filter((_, idx) => idx !== i);
    next.forEach((s, idx) => (s.ordem = idx + 1));
    setState({ ...state, steps: next });
  };
  const addStep = () =>
    setState({
      ...state,
      steps: [...steps, { ordem: steps.length + 1, nome: `Etapa ${steps.length + 1}`, tipo: 'unico', sla_horas: 48, aprovador_papel: 'administrador' }],
    });

  return (
    <Dialog open onOpenChange={() => setState(null)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{wf.id ? 'Editar fluxo' : 'Novo fluxo'}</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome</Label>
              <Input value={wf.nome ?? ''} onChange={(e) => setState({ ...state, wf: { ...wf, nome: e.target.value } })} />
            </div>
            <div>
              <Label>Aplica-se a</Label>
              <Select value={wf.referencia_tipo} onValueChange={(v) => setState({ ...state, wf: { ...wf, referencia_tipo: v as any } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase_request">Solicitação de Compra</SelectItem>
                  <SelectItem value="purchase_order">Pedido de Compra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor mínimo</Label>
              <Input type="number" value={wf.valor_min ?? 0} onChange={(e) => setState({ ...state, wf: { ...wf, valor_min: Number(e.target.value) } })} />
            </div>
            <div>
              <Label>Valor máximo (vazio = sem teto)</Label>
              <Input type="number" value={wf.valor_max ?? ''} onChange={(e) => setState({ ...state, wf: { ...wf, valor_max: e.target.value ? Number(e.target.value) : null } })} />
            </div>
            <div>
              <Label>Categoria (opcional)</Label>
              <Input value={wf.categoria ?? ''} onChange={(e) => setState({ ...state, wf: { ...wf, categoria: e.target.value || null } })} />
            </div>
            <div>
              <Label>Prioridade (menor = primeiro)</Label>
              <Input type="number" value={wf.prioridade ?? 100} onChange={(e) => setState({ ...state, wf: { ...wf, prioridade: Number(e.target.value) } })} />
            </div>
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Textarea value={wf.descricao ?? ''} onChange={(e) => setState({ ...state, wf: { ...wf, descricao: e.target.value } })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={wf.ativo ?? true} onCheckedChange={(v) => setState({ ...state, wf: { ...wf, ativo: v } })} />
              <Label>Ativo</Label>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Etapas</h3>
              <Button size="sm" variant="outline" onClick={addStep}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
            </div>
            <div className="space-y-2">
              {steps.map((s, i) => (
                <Card key={i}>
                  <CardContent className="pt-4 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-1 flex flex-col gap-1">
                      <Button size="icon" variant="ghost" onClick={() => moveStep(i, -1)}><ArrowUp className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => moveStep(i, 1)}><ArrowDown className="h-3 w-3" /></Button>
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Nome</Label>
                      <Input value={s.nome ?? ''} onChange={(e) => updateStep(i, { nome: e.target.value })} />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Aprovador (papel)</Label>
                      <Select value={s.aprovador_papel ?? ''} onValueChange={(v) => updateStep(i, { aprovador_papel: v })}>
                        <SelectTrigger><SelectValue placeholder="Papel" /></SelectTrigger>
                        <SelectContent>
                          {PAPEIS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={s.tipo ?? 'unico'} onValueChange={(v) => updateStep(i, { tipo: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unico">Único</SelectItem>
                          <SelectItem value="paralelo">Paralelo</SelectItem>
                          <SelectItem value="qualquer_um">Qualquer um</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">SLA (h)</Label>
                      <Input type="number" value={s.sla_horas ?? 48} onChange={(e) => updateStep(i, { sla_horas: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-1 pt-5">
                      <Button size="icon" variant="ghost" onClick={() => removeStep(i)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setState(null)}>Cancelar</Button>
          <Button onClick={onSave} disabled={saving || !wf.nome || steps.length === 0}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
