import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useApproveReservation, useRejectReservation } from '@/hooks/useRooms';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  RESERVATION_STATUS_LABEL, RESERVATION_EVENT_TYPE_LABEL,
  reservationStatusBadgeClass, formatDateTime,
} from '@/lib/rooms';

interface Props {
  reservation: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ReservationApprovalPanel({ reservation: r, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const approve = useApproveReservation();
  const reject = useRejectReservation();

  if (!r) return null;

  const doApprove = async () => {
    try {
      await approve.mutateAsync({ id: r.id, approverId: user!.id, notes });
      toast({ title: 'Reserva aprovada' });
      onOpenChange(false);
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };
  const doReject = async () => {
    if (!notes.trim()) return toast({ title: 'Informe um motivo', variant: 'destructive' });
    try {
      await reject.mutateAsync({ id: r.id, approverId: user!.id, notes });
      toast({ title: 'Reserva rejeitada' });
      onOpenChange(false);
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  const canDecide = r.status === 'solicitada';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>{r.title}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={reservationStatusBadgeClass(r.status)}>{RESERVATION_STATUS_LABEL[r.status] ?? r.status}</Badge>
            <Badge variant="secondary">{RESERVATION_EVENT_TYPE_LABEL[r.event_type] ?? r.event_type}</Badge>
          </div>

          <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Sala</dt><dd className="col-span-2">{r.room?.code} · {r.room?.name}</dd>
            <dt className="text-muted-foreground">Início</dt><dd className="col-span-2">{formatDateTime(r.start_datetime)}</dd>
            <dt className="text-muted-foreground">Fim</dt><dd className="col-span-2">{formatDateTime(r.end_datetime)}</dd>
            {r.requester?.full_name && (<><dt className="text-muted-foreground">Solicitante</dt><dd className="col-span-2">{r.requester.full_name}</dd></>)}
            {r.description && (<><dt className="text-muted-foreground">Descrição</dt><dd className="col-span-2 whitespace-pre-wrap">{r.description}</dd></>)}
            {r.approval_notes && (<><dt className="text-muted-foreground">Nota</dt><dd className="col-span-2 italic">{r.approval_notes}</dd></>)}
          </dl>

          {canDecide && (
            <div className="space-y-2 pt-2 border-t">
              <label className="text-sm font-medium">Nota (opcional para aprovar, obrigatória para rejeitar)</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={doReject} disabled={reject.isPending}>
                  {reject.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}Rejeitar
                </Button>
                <Button onClick={doApprove} disabled={approve.isPending}>
                  {approve.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}Aprovar
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
