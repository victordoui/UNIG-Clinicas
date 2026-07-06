import { useMemo } from 'react';
import { useRoomAgenda } from '@/hooks/useRooms';
import { addDays, formatTime, reservationStatusBadgeClass, RESERVATION_STATUS_LABEL } from '@/lib/rooms';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  roomId: string;
  weekStart: Date;
}

const DAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

export function RoomWeekAgenda({ roomId, weekStart }: Props) {
  const { data: items = [], isLoading } = useRoomAgenda(roomId, weekStart);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const byDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    days.forEach((d) => { map[d.toDateString()] = []; });
    (items ?? []).forEach((r: any) => {
      const key = new Date(r.start_datetime).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [items, days]);

  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-7 gap-2">{DAYS.map((d) => <Skeleton key={d} className="h-40 w-full" />)}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
      {days.map((d, i) => (
        <Card key={i} className="min-h-[160px]">
          <CardContent className="p-2 space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-baseline justify-between">
              <span>{DAYS[i]}</span>
              <span>{d.getDate().toString().padStart(2,'0')}/{(d.getMonth()+1).toString().padStart(2,'0')}</span>
            </div>
            <div className="space-y-1">
              {(byDay[d.toDateString()] ?? []).length === 0 && <p className="text-xs text-muted-foreground text-center py-4">—</p>}
              {(byDay[d.toDateString()] ?? []).map((r: any) => (
                <div key={r.id} className="rounded border p-2 text-xs space-y-1">
                  <div className="font-medium leading-tight truncate">{r.title}</div>
                  <div className="text-muted-foreground">{formatTime(r.start_datetime)}–{formatTime(r.end_datetime)}</div>
                  <Badge variant="outline" className={`${reservationStatusBadgeClass(r.status)} text-[10px] px-1 py-0`}>{RESERVATION_STATUS_LABEL[r.status] ?? r.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
