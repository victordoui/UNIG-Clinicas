import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useCreateUnit, useUpdateUnit, type UnitInput } from '@/hooks/useAdmin';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unit?: (UnitInput & { id: string }) | null;
}

const empty: UnitInput = { code: '', name: '', city: '', state: '', address: '', phone: '', email: '', is_active: true };

export function UnitFormDialog({ open, onOpenChange, unit }: Props) {
  const [form, setForm] = useState<UnitInput>(empty);
  const create = useCreateUnit();
  const update = useUpdateUnit();

  useEffect(() => {
    if (unit) setForm({
      code: unit.code, name: unit.name, city: unit.city, state: unit.state,
      address: unit.address ?? '', phone: unit.phone ?? '', email: unit.email ?? '',
      is_active: unit.is_active ?? true,
    });
    else setForm(empty);
  }, [unit, open]);

  const submit = async () => {
    try {
      if (unit) await update.mutateAsync({ id: unit.id, ...form });
      else await create.mutateAsync(form);
      toast({ title: unit ? 'Unidade atualizada' : 'Unidade criada' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message, variant: 'destructive' });
    }
  };

  const set = (k: keyof UnitInput) => (v: any) => setForm(s => ({ ...s, [k]: v }));
  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{unit ? 'Editar unidade' : 'Nova unidade'}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2 md:grid-cols-2">
          <div><Label>Código *</Label><Input value={form.code} onChange={e => set('code')(e.target.value)} /></div>
          <div><Label>Nome *</Label><Input value={form.name} onChange={e => set('name')(e.target.value)} /></div>
          <div><Label>Cidade *</Label><Input value={form.city} onChange={e => set('city')(e.target.value)} /></div>
          <div><Label>UF *</Label><Input maxLength={2} value={form.state} onChange={e => set('state')(e.target.value.toUpperCase())} /></div>
          <div className="md:col-span-2"><Label>Endereço</Label><Input value={form.address ?? ''} onChange={e => set('address')(e.target.value)} /></div>
          <div><Label>Telefone</Label><Input value={form.phone ?? ''} onChange={e => set('phone')(e.target.value)} /></div>
          <div><Label>E-mail</Label><Input value={form.email ?? ''} onChange={e => set('email')(e.target.value)} /></div>
          <div className="flex items-center gap-2 md:col-span-2">
            <Switch checked={!!form.is_active} onCheckedChange={v => set('is_active')(v)} />
            <Label>Ativa</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy || !form.code || !form.name || !form.city || !form.state}>
            {busy ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
