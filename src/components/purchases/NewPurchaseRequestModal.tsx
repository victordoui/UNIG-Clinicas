import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { useCreatePurchaseRequest } from '@/hooks/usePurchaseRequests';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { PRIORITY_LABEL, PurchasePriority } from '@/lib/purchaseLabels';
import { useMyCostCenters } from '@/hooks/useUserCostCenters';
import { useAuth } from '@/hooks/useAuth';

const ALLOWED_ROLES = ['super_admin', 'administrador', 'coordenador_operacoes', 'gerente_geral', 'compras', 'gestor_aprovador', 'solicitante'] as const;

const schema = z.object({
  item_descricao: z.string().trim().min(3, 'Descrição muito curta').max(500),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  prioridade: z.enum(['baixa','normal','alta','urgente']),
  setor: z.string().trim().max(80).optional().or(z.literal('')),
  unidade: z.string().trim().max(40).optional().or(z.literal('')),
  categoria: z.string().trim().max(80).optional().or(z.literal('')),
  valor_estimado: z.number().nonnegative().nullable().optional(),
  prazo_desejado: z.string().optional().or(z.literal('')),
  justificativa: z.string().trim().max(2000).optional().or(z.literal('')),
  observacoes: z.string().trim().max(1000).optional().or(z.literal('')),
  cost_center_id: z.string().uuid().nullable().optional(),
});

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const empty = {
  item_descricao: '', quantidade: 1, prioridade: 'normal' as PurchasePriority,
  setor: '', unidade: '', categoria: '', valor_estimado: null as number | null,
  prazo_desejado: '', justificativa: '', observacoes: '',
  cost_center_id: null as string | null,
};

export function NewPurchaseRequestModal({ open, onOpenChange }: Props) {
  const [form, setForm] = useState(empty);
  const create = useCreatePurchaseRequest();
  const { toast } = useToast();
  const { unigRole } = useAuth();
  const { data: centers = [], isLoading: ccLoading } = useMyCostCenters();
  const allowed = ALLOWED_ROLES.includes(unigRole as any);

  useEffect(() => {
    if (!open) return;
    const def = centers.find(c => c.is_default);
    setForm({ ...empty, cost_center_id: def?.id ?? null });
  }, [open, centers]);

  const set = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!allowed) {
      toast({ title: 'Sem permissão', description: 'Seu papel não permite abrir solicitações.', variant: 'destructive' });
      return;
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: 'Dados inválidos', description: parsed.error.issues[0].message, variant: 'destructive' });
      return;
    }
    if (centers.length > 0 && !parsed.data.cost_center_id) {
      toast({ title: 'Centro de custo obrigatório', description: 'Selecione o centro de custo da requisição.', variant: 'destructive' });
      return;
    }
    const cleaned: any = Object.fromEntries(
      Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v]),
    );
    // auto-fill setor from CC name when blank
    if (!cleaned.setor && cleaned.cost_center_id) {
      const cc = centers.find(c => c.id === cleaned.cost_center_id);
      if (cc) cleaned.setor = cc.nome;
    }
    await create.mutateAsync(cleaned);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova Solicitação de Compra</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Descrição do item *</Label>
            <Textarea rows={2} value={form.item_descricao} onChange={e => set('item_descricao', e.target.value)} />
          </div>
          <div>
            <Label>Quantidade *</Label>
            <Input type="number" min={0.01} step="any" value={form.quantidade}
              onChange={e => set('quantidade', Number(e.target.value))} />
          </div>
          <div>
            <Label>Unidade</Label>
            <Input value={form.unidade} onChange={e => set('unidade', e.target.value)} placeholder="UN, CX, KG..." />
          </div>
          <div>
            <Label>Prioridade *</Label>
            <Select value={form.prioridade} onValueChange={(v: PurchasePriority) => set('prioridade', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PRIORITY_LABEL) as PurchasePriority[]).map(k =>
                  <SelectItem key={k} value={k} data-option-domain="priority">{PRIORITY_LABEL[k]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Setor</Label>
            <Input value={form.setor} onChange={e => set('setor', e.target.value)} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input value={form.categoria} onChange={e => set('categoria', e.target.value)} />
          </div>
          {centers.length > 0 ? (
            <div>
              <Label>Centro de custo *</Label>
              <Select
                value={form.cost_center_id ?? ''}
                onValueChange={(v) => set('cost_center_id', v || null)}
              >
                <SelectTrigger><SelectValue placeholder={ccLoading ? 'Carregando…' : 'Selecione um centro de custo'} /></SelectTrigger>
                <SelectContent>
                  {centers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}{c.is_default ? ' (padrão)' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="md:col-span-2 text-sm text-muted-foreground p-3 border rounded-lg bg-muted/30">
              Você não está vinculado a nenhum centro de custo. Peça ao administrador para liberar seu acesso.
            </div>
          )}
          <div>
            <Label>Valor estimado (R$)</Label>
            <Input type="number" step="0.01" value={form.valor_estimado ?? ''}
              onChange={e => set('valor_estimado', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div>
            <Label>Prazo desejado</Label>
            <Input type="date" value={form.prazo_desejado} onChange={e => set('prazo_desejado', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Justificativa</Label>
            <Textarea rows={3} value={form.justificativa} onChange={e => set('justificativa', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <LoadingButton loading={create.isPending} onClick={submit}>Criar solicitação</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
