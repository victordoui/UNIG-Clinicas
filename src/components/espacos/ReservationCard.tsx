import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, MapPinned, User, X } from 'lucide-react';
import { RESERVATION_STATUS_LABEL, RESERVATION_EVENT_TYPE_LABEL, reservationStatusBadgeClass, formatDate, formatTime } from '@/lib/rooms';

interface Props {
  reservation: any;
  onCancel?: (id: string) => void;
  onSelect?: (r: any) => void;
  actions?: React.ReactNode;
}

export function ReservationCard({ reservation: r, onCancel, onSelect, actions }: Props) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-tight">{r.title}</h3>
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span className="flex items-center gap-1"><MapPinned className="h-3 w-3" />{r.room?.code} · {r.room?.name}</span>
              <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(r.start_datetime)}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(r.start_datetime)}–{formatTime(r.end_datetime)}</span>
              {r.requester?.full_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{r.requester.full_name}</span>}
            </div>
          </div>
          <Badge variant="outline" className={reservationStatusBadgeClass(r.status)}>{RESERVATION_STATUS_LABEL[r.status] ?? r.status}</Badge>
        </div>

        <div className="flex flex-wrap gap-1 text-xs">
          <Badge variant="secondary">{RESERVATION_EVENT_TYPE_LABEL[r.event_type] ?? r.event_type}</Badge>
        </div>

        {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
        {r.approval_notes && (
          <p className="text-xs italic text-muted-foreground border-l-2 pl-2 border-primary/40">
            Nota: {r.approval_notes}
          </p>
        )}

        {(onSelect || onCancel || actions) && (
          <div className="flex justify-end gap-1 pt-2 border-t">
            {actions}
            {onSelect && <Button size="sm" variant="outline" onClick={() => onSelect(r)}>Detalhes</Button>}
            {onCancel && ['solicitada','aprovada'].includes(r.status) && (
              <Button size="sm" variant="ghost" onClick={() => onCancel(r.id)}>
                <X className="h-4 w-4 mr-1" />Cancelar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
