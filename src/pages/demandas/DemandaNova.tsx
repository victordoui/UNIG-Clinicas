import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DEMAND_STATUS, DEMAND_STATUS_LABEL, DEMAND_PRIORITY, DEMAND_PRIORITY_LABEL,
  DEMAND_TYPE, DEMAND_TYPE_LABEL, useCreateDemand, useOrgGestores, DemandInput,
  useReplaceDemandUnits,
} from '@/hooks/useOperationalDemands';
import { UnitsMultiSelect } from '@/components/demandas/UnitsMultiSelect';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function DemandaNova() {
  const navigate = useNavigate();
  const create = useCreateDemand();
  const replaceUnits = useReplaceDemandUnits();
  const { profile, organization } = useAuth();
  const { data: gestores = [] } = useOrgGestores();

  const [form, setForm] = useState<DemandInput>({
    status: 'registrada',
    prioridade: 'media',
    tipo: 'projeto_operacional',
    gestor_responsavel: profile?.id ?? undefined,
  });
  const [units, setUnits] = useState<string[]>([]);

  const set = <K extends keyof DemandInput>(k: K, v: DemandInput[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const primaryUnit = form.unidade ?? units[0] ?? '';
  const canSubmit = !!form.nome && !!primaryUnit && !!form.objetivo && !!form.gestor_responsavel && !!form.status;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const created = await create.mutateAsync({ ...form, unidade: primaryUnit });
    if (organization?.organization_id && units.length > 0) {
      await replaceUnits.mutateAsync({
        demandId: created.id,
        organizationId: organization.organization_id,
        units,
      });
    }
    navigate(`/demandas/${created.id}`);
  }

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <h1 className="text-2xl font-bold">Nova Atualização Gerencial</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Identificação</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Nome do projeto ou demanda *">
              <Input value={form.nome ?? ''} onChange={(e) => set('nome', e.target.value)} required />
            </Field>
            <Field label="Tipo da demanda *">
              <Select value={form.tipo} onValueChange={(v) => set('tipo', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEMAND_TYPE.map((t) => <SelectItem key={t} value={t}>{DEMAND_TYPE_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Unidade principal *">
              <Input value={form.unidade ?? ''} onChange={(e) => set('unidade', e.target.value)} placeholder="Ex.: UNIG Nova Iguaçu" required />
            </Field>
            <Field label="Outras unidades envolvidas">
              <UnitsMultiSelect value={units} onChange={setUnits} />
            </Field>
            <Field label="Área responsável">
              <Input value={form.area ?? ''} onChange={(e) => set('area', e.target.value)} />
            </Field>
            <Field label="Gestor responsável *">
              <Select value={form.gestor_responsavel ?? ''} onValueChange={(v) => set('gestor_responsavel', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione um responsável" /></SelectTrigger>
                <SelectContent>
                  {gestores.map((g) => <SelectItem key={g.id} value={g.id}>{g.full_name ?? g.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Prioridade *">
              <Select value={form.prioridade} onValueChange={(v) => set('prioridade', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEMAND_PRIORITY.map((p) => <SelectItem key={p} value={p}>{DEMAND_PRIORITY_LABEL[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Conteúdo</h2>
          <Field label="Objetivo da iniciativa *">
            <Textarea rows={2} value={form.objetivo ?? ''} onChange={(e) => set('objetivo', e.target.value)} required />
          </Field>
          <Field label="Descrição do status atual">
            <Textarea rows={3} value={form.descricao ?? ''} onChange={(e) => set('descricao', e.target.value)} />
          </Field>
          <Field label="Resultado esperado">
            <Textarea rows={2} value={form.resultado_esperado ?? ''} onChange={(e) => set('resultado_esperado', e.target.value)} />
          </Field>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Planejamento</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Status atual *">
              <Select value={form.status} onValueChange={(v) => set('status', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEMAND_STATUS.map((s) => <SelectItem key={s} value={s}>{DEMAND_STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Prazo estimado de conclusão">
              <Input type="date" value={form.prazo_estimado ?? ''} onChange={(e) => set('prazo_estimado', e.target.value)} />
            </Field>
          </div>
          <Field label="Próximas etapas">
            <Textarea rows={2} value={form.proximas_etapas ?? ''} onChange={(e) => set('proximas_etapas', e.target.value)} />
          </Field>
          <Field label="Dependências">
            <Textarea
              rows={2}
              value={form.dependencies ?? ''}
              onChange={(e) => set('dependencies', e.target.value)}
              placeholder="O que está bloqueando ou de quem depende o avanço?"
            />
          </Field>
          <Field label="Pontos de atenção">
            <Textarea
              rows={2}
              value={form.attention_points ?? ''}
              onChange={(e) => set('attention_points', e.target.value)}
              placeholder="Riscos, alertas ou pontos que a diretoria precisa saber"
            />
          </Field>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" disabled={!canSubmit || create.isPending}>
            <Save className="h-4 w-4 mr-1" /> {create.isPending ? 'Salvando…' : 'Criar atualização'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}
