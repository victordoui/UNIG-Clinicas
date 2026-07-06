import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Activity } from 'lucide-react';
import {
  useRegisterEvolution, DEMAND_STATUS, DEMAND_STATUS_LABEL, DemandStatus, OperationalDemand,
} from '@/hooks/useOperationalDemands';

interface Props {
  demand: OperationalDemand;
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
  triggerSize?: 'default' | 'sm' | 'lg' | 'icon';
}

export function EvolutionUpdateDialog({
  demand, triggerLabel = 'Atualizar evolução',
  triggerVariant = 'default', triggerSize = 'sm',
}: Props) {
  const register = useRegisterEvolution();
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState('');
  const [percentual, setPercentual] = useState<string>('');
  const [milestones, setMilestones] = useState<string[]>(['']);
  const [nextSteps, setNextSteps] = useState(demand.proximas_etapas ?? '');
  const [attention, setAttention] = useState(demand.attention_points ?? '');
  const [statusSugerido, setStatusSugerido] = useState<DemandStatus | '__keep__'>('__keep__');

  function reset() {
    setTexto(''); setPercentual(''); setMilestones(['']);
    setNextSteps(demand.proximas_etapas ?? ''); setAttention(demand.attention_points ?? '');
    setStatusSugerido('__keep__');
  }

  async function submit() {
    if (!texto.trim()) return;
    await register.mutateAsync({
      demandId: demand.id,
      texto,
      percentual: percentual ? Math.max(0, Math.min(100, Number(percentual))) : null,
      milestones: milestones.map((m) => m.trim()).filter(Boolean),
      nextSteps: nextSteps !== (demand.proximas_etapas ?? '') ? nextSteps : undefined,
      attentionPoints: attention !== (demand.attention_points ?? '') ? attention : undefined,
      newStatus: statusSugerido !== '__keep__' ? statusSugerido : null,
    });
    setOpen(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>
          <Activity className="h-4 w-4 mr-1" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atualizar evolução — {demand.code}</DialogTitle>
          <DialogDescription>
            Registre o andamento, marcos concluídos e próximos passos. O Gerente Geral será notificado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição da evolução *</Label>
            <Textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)}
              placeholder="O que foi feito desde a última atualização?" />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Progresso (%)</Label>
              <Input type="number" min={0} max={100} value={percentual}
                onChange={(e) => setPercentual(e.target.value)} placeholder="0 a 100" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sugerir novo status</Label>
              <Select value={statusSugerido} onValueChange={(v) => setStatusSugerido(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__keep__">Manter status atual</SelectItem>
                  {DEMAND_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>{DEMAND_STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Marcos concluídos</Label>
              <Button size="sm" variant="ghost" type="button"
                onClick={() => setMilestones((p) => [...p, ''])}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar marco
              </Button>
            </div>
            <div className="space-y-2">
              {milestones.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={m} onChange={(e) => {
                    const next = [...milestones]; next[i] = e.target.value; setMilestones(next);
                  }} placeholder={`Marco ${i + 1}`} />
                  {milestones.length > 1 && (
                    <Button size="icon" variant="ghost" type="button"
                      onClick={() => setMilestones(milestones.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Próximos passos</Label>
            <Textarea rows={2} value={nextSteps} onChange={(e) => setNextSteps(e.target.value)}
              placeholder="O que vem a seguir?" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Pontos de atenção</Label>
            <Textarea rows={2} value={attention} onChange={(e) => setAttention(e.target.value)}
              placeholder="Riscos, bloqueios, alertas para o Gerente Geral" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!texto.trim() || register.isPending}>
            Registrar evolução
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
