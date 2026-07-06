import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useRooms } from '@/hooks/useRooms';
import { RoomWeekAgenda } from '@/components/espacos/RoomWeekAgenda';
import { ReservationFormDialog } from '@/components/espacos/ReservationFormDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { addDays, startOfWeek } from '@/lib/rooms';

export default function Agenda() {
  const [params, setParams] = useSearchParams();
  const { data: rooms = [] } = useRooms({});
  const initialRoom = params.get('room') ?? '';
  const [roomId, setRoomId] = useState(initialRoom);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek());

  const label = useMemo(() => {
    const end = addDays(weekStart, 6);
    return `${weekStart.toLocaleDateString('pt-BR')} — ${end.toLocaleDateString('pt-BR')}`;
  }, [weekStart]);

  const selected = rooms.find((r: any) => r.id === roomId);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="h-6 w-6 text-primary" />Agenda de Salas</h1>
            <p className="text-muted-foreground text-sm">Visualize reservas confirmadas e pendentes por sala.</p>
          </div>
          <ReservationFormDialog defaultRoomId={roomId || undefined} trigger={<Button><Plus className="h-4 w-4 mr-1" />Nova reserva</Button>} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={roomId || 'none'} onValueChange={(v) => { setRoomId(v === 'none' ? '' : v); setParams(v === 'none' ? {} : { room: v }); }}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Selecione uma sala" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione uma sala</SelectItem>
              {rooms.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.code} — {r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setWeekStart((d) => addDays(d, -7))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="text-sm px-2">{label}</div>
            <Button variant="outline" size="icon" onClick={() => setWeekStart((d) => addDays(d, 7))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek())}>Hoje</Button>
          </div>
        </div>

        {!roomId ? (
          <p className="text-sm text-muted-foreground text-center py-10">Selecione uma sala para ver a agenda semanal.</p>
        ) : (
          <>
            {selected && <div className="text-sm text-muted-foreground">{selected.name} · Capacidade {selected.capacity}</div>}
            <RoomWeekAgenda roomId={roomId} weekStart={weekStart} />
          </>
        )}
      </div>
    </MainLayout>
  );
}
