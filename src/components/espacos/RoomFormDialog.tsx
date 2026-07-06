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
import { useUpsertRoom } from '@/hooks/useRooms';
import { useUnits } from '@/hooks/useAcademicData';
import { ROOM_TYPE_LABEL, ROOM_STATUS_LABEL } from '@/lib/rooms';

export function RoomFormDialog({ row, trigger }: { row?: any; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const { data: units = [] } = useUnits();
  const upsert = useUpsertRoom();

  useEffect(() => {
    if (open) setForm(row ? { ...row } : {
      status: 'disponivel', room_type: 'sala_aula', capacity: 40,
      has_projector: false, has_air_conditioning: false, has_computer: false,
    });
  }, [open, row]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.code) return toast({ title: 'Preencha nome e código', variant: 'destructive' });
    try {
      const { id, unit, created_at, updated_at, ...values } = form;
      values.capacity = Number(values.capacity) || 0;
      await upsert.mutateAsync({ id: row?.id, values });
      toast({ title: row ? 'Sala atualizada' : 'Sala cadastrada' });
      setOpen(false);
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{row ? 'Editar sala' : 'Nova sala'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label>Nome *</Label><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></div>
          <div><Label>Código *</Label><Input value={form.code ?? ''} onChange={(e) => set('code', e.target.value)} /></div>
          <div><Label>Capacidade</Label><Input type="number" value={form.capacity ?? 0} onChange={(e) => set('capacity', e.target.value)} /></div>
          <div><Label>Tipo</Label>
            <Select value={form.room_type ?? 'sala_aula'} onValueChange={(v) => set('room_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(ROOM_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={form.status ?? 'disponivel'} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(ROOM_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Bloco</Label><Input value={form.block ?? ''} onChange={(e) => set('block', e.target.value)} /></div>
          <div><Label>Andar</Label><Input value={form.floor ?? ''} onChange={(e) => set('floor', e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Unidade</Label>
            <Select value={form.unit_id ?? 'none'} onValueChange={(v) => set('unit_id', v === 'none' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 grid grid-cols-3 gap-2">
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.has_projector} onCheckedChange={(v) => set('has_projector', v)} />Projetor</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.has_air_conditioning} onCheckedChange={(v) => set('has_air_conditioning', v)} />Ar-condicionado</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.has_computer} onCheckedChange={(v) => set('has_computer', v)} />Computador</label>
          </div>
          <div className="md:col-span-2"><Label>Observações</Label><Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={upsert.isPending}>{upsert.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
