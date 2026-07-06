import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useRooms, useCreateReservation, useUpdateReservation } from '@/hooks/useRooms';
import { useAuth } from '@/hooks/useAuth';
import { RESERVATION_EVENT_TYPE_LABEL } from '@/lib/rooms';

interface Props {
  row?: any;
  defaultRoomId?: string;
  trigger: React.ReactNode;
  onSaved?: () => void;
}

function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReservationFormDialog({ row, defaultRoomId, trigger, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const { user, unigRole } = useAuth();
  const { data: rooms = [] } = useRooms({});
  const create = useCreateReservation();
  const update = useUpdateReservation();
  const isStaff = ['super_admin','administrador','operador_espacos','gestor_unidade'].includes(unigRole);

  useEffect(() => {
    if (open) {
      setForm(row ? {
        ...row,
        start_datetime: toLocalInput(row.start_datetime),
        end_datetime: toLocalInput(row.end_datetime),
      } : {
        room_id: defaultRoomId ?? '',
        title: '',
        event_type: 'reserva',
        status: isStaff ? 'aprovada' : 'solicitada',
        start_datetime: '',
        end_datetime: '',
      });
    }
  }, [open, row, defaultRoomId, isStaff]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.room_id || !form.title || !form.start_datetime || !form.end_datetime) {
      return toast({ title: 'Preencha sala, título e datas', variant: 'destructive' });
    }
    const startISO = new Date(form.start_datetime).toISOString();
    const endISO = new Date(form.end_datetime).toISOString();
    if (new Date(endISO) <= new Date(startISO)) {
      return toast({ title: 'Data final deve ser depois da inicial', variant: 'destructive' });
    }
    const room = rooms.find((r: any) => r.id === form.room_id);
    try {
      const payload: any = {
        room_id: form.room_id,
        unit_id: room?.unit_id ?? null,
        title: form.title,
        description: form.description ?? null,
        event_type: form.event_type ?? 'reserva',
        start_datetime: startISO,
        end_datetime: endISO,
        status: form.status ?? (isStaff ? 'aprovada' : 'solicitada'),
      };
      if (row) {
        await update.mutateAsync({ id: row.id, values: payload });
        toast({ title: 'Reserva atualizada' });
      } else {
        payload.requester_id = user?.id;
        if (isStaff && payload.status === 'aprovada') payload.approved_by = user?.id;
        await create.mutateAsync(payload);
        toast({ title: isStaff ? 'Reserva registrada' : 'Solicitação enviada' });
      }
      setOpen(false);
      onSaved?.();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{row ? 'Editar reserva' : 'Nova reserva'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label>Título *</Label><Input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Sala *</Label>
            <Select value={form.room_id ?? ''} onValueChange={(v) => set('room_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione a sala" /></SelectTrigger>
              <SelectContent>
                {rooms.filter((r: any) => r.status !== 'inativa').map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.code} — {r.name} ({r.capacity} lug.)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Tipo</Label>
            <Select value={form.event_type ?? 'reserva'} onValueChange={(v) => set('event_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(RESERVATION_EVENT_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {isStaff && (
            <div><Label>Status</Label>
              <Select value={form.status ?? 'aprovada'} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solicitada">Solicitada</SelectItem>
                  <SelectItem value="aprovada">Aprovada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Início *</Label><Input type="datetime-local" value={form.start_datetime ?? ''} onChange={(e) => set('start_datetime', e.target.value)} /></div>
          <div><Label>Fim *</Label><Input type="datetime-local" value={form.end_datetime ?? ''} onChange={(e) => set('end_datetime', e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Descrição / finalidade</Label><Textarea value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={pending}>{pending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
