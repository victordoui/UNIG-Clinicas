import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPinned, Users, Building2, Monitor, Wind, Projector, Pencil, CalendarDays, Mic, Tv, PanelsTopLeft, Presentation } from 'lucide-react';
import { ROOM_TYPE_LABEL, ROOM_STATUS_LABEL, roomStatusBadgeClass } from '@/lib/rooms';
import { RoomFormDialog } from './RoomFormDialog';
import { ReservationFormDialog } from './ReservationFormDialog';
import { ConfirmDeleteDialog } from '@/components/academico/ConfirmDeleteDialog';
import { Link } from 'react-router-dom';

interface Props {
  room: any;
  canWrite?: boolean;
  onDelete?: (id: string) => void;
  showReserve?: boolean;
  compact?: boolean;
}

export function RoomCard({ room, canWrite, onDelete, showReserve = true, compact }: Props) {
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
          <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{room.seats_count ?? room.capacity} lug.</Badge>
          {room.has_projector && <Badge variant="outline" className="gap-1"><Projector className="h-3 w-3" />Projetor</Badge>}
          {room.has_air_conditioning && <Badge variant="outline" className="gap-1"><Wind className="h-3 w-3" />Ar</Badge>}
          {room.has_computer && <Badge variant="outline" className="gap-1"><Monitor className="h-3 w-3" />PC</Badge>}
          {room.has_audio_system && <Badge variant="outline" className="gap-1"><Mic className="h-3 w-3" />Audio</Badge>}
          {room.has_tv && <Badge variant="outline" className="gap-1"><Tv className="h-3 w-3" />TV</Badge>}
          {room.has_whiteboard && <Badge variant="outline" className="gap-1"><Presentation className="h-3 w-3" />Quadro</Badge>}
          {room.has_interactive_screen && <Badge variant="outline" className="gap-1"><PanelsTopLeft className="h-3 w-3" />Tela interativa</Badge>}
          {room.quality_tier && <Badge variant="outline">{room.quality_tier === 'semi_premium' ? 'Semi Premium' : room.quality_tier === 'premium' ? 'Premium' : 'Padrao'}</Badge>}
        </div>

        <div className="text-xs text-muted-foreground space-y-0.5">
          {(room.block || room.floor) && <div>{room.block && `Bloco ${room.block}`}{room.block && room.floor && ' · '}{room.floor && `Andar ${room.floor}`}</div>}
          {room.unit?.name && <div className="flex items-center gap-1"><Building2 className="h-3 w-3" />{room.unit.name}</div>}
          {room.furniture_type && <div><span className="font-medium text-foreground">Mobiliário:</span> {room.furniture_type}</div>}
          {room.usage_restriction && <div><span className="font-medium text-foreground">Uso:</span> {room.usage_restriction}</div>}
        </div>

        <div className="flex justify-end gap-1 pt-2 border-t">
          {showReserve && room.status !== 'inativa' && (
            <ReservationFormDialog
              defaultRoomId={room.id}
              trigger={<Button size="sm" variant="outline"><CalendarDays className="h-4 w-4 mr-1" />Reservar</Button>}
            />
          )}
          <Button size="sm" variant="ghost" asChild>
            <Link to={`/espacos/agenda?room=${room.id}`}><CalendarDays className="mr-1 h-4 w-4" />Agenda</Link>
          </Button>
          {canWrite && (
            <>
              <RoomFormDialog row={room} trigger={<Button size="icon" variant="ghost" title={`Editar ${room.name}`} aria-label={`Editar ${room.name}`}><Pencil className="h-4 w-4" /></Button>} />
              {onDelete && <ConfirmDeleteDialog onConfirm={() => onDelete(room.id)} description={`Excluir sala ${room.name}?`} />}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
