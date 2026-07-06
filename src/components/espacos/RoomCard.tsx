import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPinned, Users, Building2, Monitor, Wind, Projector, Pencil, CalendarDays } from 'lucide-react';
import { ROOM_TYPE_LABEL, ROOM_STATUS_LABEL, roomStatusBadgeClass } from '@/lib/rooms';
import { RoomFormDialog } from './RoomFormDialog';
import { ConfirmDeleteDialog } from '@/components/academico/ConfirmDeleteDialog';
import { Link } from 'react-router-dom';

interface Props {
  room: any;
  canWrite?: boolean;
  onDelete?: (id: string) => void;
  onReserve?: (room: any) => void;
  compact?: boolean;
}

export function RoomCard({ room, canWrite, onDelete, onReserve, compact }: Props) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className={compact ? 'p-3 space-y-2' : 'p-4 space-y-3'}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground font-mono">{room.code}</div>
            <h3 className="font-semibold leading-tight flex items-center gap-1"><MapPinned className="h-4 w-4 text-primary" />{room.name}</h3>
          </div>
          <Badge variant="outline" className={roomStatusBadgeClass(room.status)}>{ROOM_STATUS_LABEL[room.status] ?? room.status}</Badge>
        </div>

        <div className="flex flex-wrap gap-1 text-xs">
          <Badge variant="secondary">{ROOM_TYPE_LABEL[room.room_type] ?? room.room_type}</Badge>
          <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{room.capacity} lug.</Badge>
          {room.has_projector && <Badge variant="outline" className="gap-1"><Projector className="h-3 w-3" />Projetor</Badge>}
          {room.has_air_conditioning && <Badge variant="outline" className="gap-1"><Wind className="h-3 w-3" />Ar</Badge>}
          {room.has_computer && <Badge variant="outline" className="gap-1"><Monitor className="h-3 w-3" />PC</Badge>}
        </div>

        <div className="text-xs text-muted-foreground space-y-0.5">
          {(room.block || room.floor) && <div>{room.block && `Bloco ${room.block}`}{room.block && room.floor && ' · '}{room.floor && `Andar ${room.floor}`}</div>}
          {room.unit?.name && <div className="flex items-center gap-1"><Building2 className="h-3 w-3" />{room.unit.name}</div>}
        </div>

        <div className="flex justify-end gap-1 pt-2 border-t">
          {onReserve && (
            <Button size="sm" variant="outline" onClick={() => onReserve(room)}>
              <CalendarDays className="h-4 w-4 mr-1" />Reservar
            </Button>
          )}
          <Button size="sm" variant="ghost" asChild>
            <Link to={`/espacos/agenda?room=${room.id}`}>Agenda</Link>
          </Button>
          {canWrite && (
            <>
              <RoomFormDialog row={room} trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>} />
              {onDelete && <ConfirmDeleteDialog onConfirm={() => onDelete(room.id)} description={`Excluir sala ${room.name}?`} />}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
