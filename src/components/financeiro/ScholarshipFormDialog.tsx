import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useUpsertScholarship } from '@/hooks/useFinance';
import { SCHOLARSHIP_TYPE_LABEL, DISCOUNT_KIND_LABEL } from '@/lib/finance';

export function ScholarshipFormDialog({ row, trigger }: { row?: any; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const upsert = useUpsertScholarship();

  useEffect(() => {
    if (open) setForm(row ? { ...row } : { type: 'bolsa_parcial', discount_kind: 'percent', discount_value: 50, active: true });
  }, [open, row]);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name) return toast({ title: 'Informe o nome', variant: 'destructive' });
    try {
      const { id, created_at, updated_at, ...values } = form;
      values.discount_value = Number(values.discount_value) || 0;
      await upsert.mutateAsync({ id: row?.id, values });
      toast({ title: row ? 'Programa atualizado' : 'Programa cadastrado' });
      setOpen(false);
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{row ? 'Editar programa de bolsa' : 'Novo programa de bolsa'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label>Nome *</Label><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></div>
          <div><Label>Código</Label><Input value={form.code ?? ''} onChange={(e) => set('code', e.target.value)} /></div>
          <div><Label>Tipo</Label>
            <Select value={form.type ?? 'bolsa_parcial'} onValueChange={(v) => set('type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(SCHOLARSHIP_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Tipo de desconto</Label>
            <Select value={form.discount_kind ?? 'percent'} onValueChange={(v) => set('discount_kind', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(DISCOUNT_KIND_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Valor do desconto</Label><Input type="number" step="0.01" value={form.discount_value ?? 0} onChange={(e) => set('discount_value', e.target.value)} /></div>
          <div><Label>Válido de</Label><Input type="date" value={form.valid_from ?? ''} onChange={(e) => set('valid_from', e.target.value || null)} /></div>
          <div><Label>Válido até</Label><Input type="date" value={form.valid_until ?? ''} onChange={(e) => set('valid_until', e.target.value || null)} /></div>
          <div className="flex items-center gap-2 md:col-span-2">
            <Switch checked={!!form.active} onCheckedChange={(v) => set('active', v)} />
            <Label className="cursor-pointer">Programa ativo</Label>
          </div>
          <div className="md:col-span-2"><Label>Observações</Label><Textarea rows={3} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={upsert.isPending}>{upsert.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
