import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useReservations, useRooms } from '@/hooks/useRooms';
import { OccupancyHeatmap } from '@/components/espacos/OccupancyHeatmap';
import { useCanReadAcademic } from '@/components/academico/StaffOnly';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, startOfWeek, overlaps, HOUR_SLOTS } from '@/lib/rooms';

export default function Ocupacao() {
  const canRead = useCanReadAcademic();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek());
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const { data: reservations = [], isLoading } = useReservations({
    status: 'aprovada',
    from: weekStart.toISOString(),
    to: weekEnd.toISOString(),
  });
  const { data: rooms = [] } = useRooms({});

  const roomStats = useMemo(() => {
    const totalHours = 7 * HOUR_SLOTS.length;
    return rooms.map((room: any) => {
      const roomRes = reservations.filter((r: any) => r.room_id === room.id);
      let occupied = 0;
      for (let d = 0; d < 7; d++) {
        const day = addDays(weekStart, d);
        HOUR_SLOTS.forEach((h) => {
          const hs = new Date(day); hs.setHours(h,0,0,0);
          const he = new Date(day); he.setHours(h+1,0,0,0);
          if (roomRes.some((r: any) => overlaps(r.start_datetime, r.end_datetime, hs, he))) occupied += 1;
        });
      }
      return { room, occupied, pct: Math.round((occupied / totalHours) * 100) };
    }).sort((a, b) => b.pct - a.pct);
  }, [rooms, reservations, weekStart]);

  const label = `${weekStart.toLocaleDateString('pt-BR')} — ${addDays(weekStart, 6).toLocaleDateString('pt-BR')}`;

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" />Ocupação de Salas</h1>
            <p className="text-muted-foreground text-sm">Uso de salas por hora e por semana.</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setWeekStart((d) => addDays(d, -7))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="text-sm px-2">{label}</div>
            <Button variant="outline" size="icon" onClick={() => setWeekStart((d) => addDays(d, 7))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek())}>Hoje</Button>
          </div>
        </div>

        {isLoading ? <Skeleton className="h-64 w-full" /> : (
          <>
            <OccupancyHeatmap weekStart={weekStart} reservations={reservations} />

            <div>
              <h2 className="font-semibold mb-2">Ocupação por sala</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {roomStats.map(({ room, pct, occupied }) => (
                  <Card key={room.id}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground font-mono">{room.code}</div>
                          <div className="font-medium leading-tight truncate">{room.name}</div>
                        </div>
                        <div className="text-lg font-semibold">{pct}%</div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground">{occupied}h ocupadas</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
