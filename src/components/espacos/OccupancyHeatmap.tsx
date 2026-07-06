import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { HOUR_SLOTS, addDays } from '@/lib/rooms';

const DAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

interface Props {
  weekStart: Date;
  reservations: any[]; // aprovadas
}

/** Heatmap dia × hora com intensidade proporcional ao nº de salas ocupadas. */
export function OccupancyHeatmap({ weekStart, reservations }: Props) {
  const grid = useMemo(() => {
    // grid[dayIdx][hour] = count
    const g: Record<number, Record<number, number>> = {};
    for (let d = 0; d < 7; d++) { g[d] = {}; HOUR_SLOTS.forEach((h) => { g[d][h] = 0; }); }
    reservations.forEach((r) => {
      const start = new Date(r.start_datetime);
      const end = new Date(r.end_datetime);
      for (let d = 0; d < 7; d++) {
        const day = addDays(weekStart, d);
        const dayStart = new Date(day); dayStart.setHours(0,0,0,0);
        const dayEnd = new Date(day); dayEnd.setHours(23,59,59,999);
        if (end < dayStart || start > dayEnd) continue;
        HOUR_SLOTS.forEach((h) => {
          const hStart = new Date(day); hStart.setHours(h,0,0,0);
          const hEnd = new Date(day); hEnd.setHours(h+1,0,0,0);
          if (start < hEnd && end > hStart) g[d][h] += 1;
        });
      }
    });
    return g;
  }, [reservations, weekStart]);

  const max = useMemo(() => {
    let m = 0;
    for (let d = 0; d < 7; d++) HOUR_SLOTS.forEach((h) => { if (grid[d][h] > m) m = grid[d][h]; });
    return m || 1;
  }, [grid]);

  return (
    <Card>
      <CardContent className="p-3 overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-left font-medium text-muted-foreground p-1">Hora</th>
              {DAYS.map((d, i) => <th key={i} className="text-center font-medium text-muted-foreground p-1">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {HOUR_SLOTS.map((h) => (
              <tr key={h}>
                <td className="p-1 text-muted-foreground">{String(h).padStart(2,'0')}:00</td>
                {Array.from({ length: 7 }).map((_, d) => {
                  const c = grid[d][h];
                  const intensity = Math.round((c / max) * 100);
                  const bg = c === 0 ? 'hsl(var(--muted))' : `hsl(var(--primary) / ${0.15 + (intensity / 100) * 0.7})`;
                  return (
                    <td key={d} className="p-0.5">
                      <div
                        className="h-6 rounded flex items-center justify-center text-[10px] font-medium"
                        style={{ background: bg, color: c > 0 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))' }}
                        title={`${c} reserva(s)`}
                      >{c > 0 ? c : ''}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
