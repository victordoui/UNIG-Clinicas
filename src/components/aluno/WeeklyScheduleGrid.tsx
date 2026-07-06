import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const DAYS = [
  { idx: 1, label: 'Seg' },
  { idx: 2, label: 'Ter' },
  { idx: 3, label: 'Qua' },
  { idx: 4, label: 'Qui' },
  { idx: 5, label: 'Sex' },
  { idx: 6, label: 'Sáb' },
];

// 30-min rows from 07:00 to 23:00 => 32 rows
const START_HOUR = 7;
const END_HOUR = 23;
const ROWS_PER_HOUR = 2;
const TOTAL_ROWS = (END_HOUR - START_HOUR) * ROWS_PER_HOUR;
const ROW_PX = 22;

const PALETTE = [
  'bg-blue-100 text-blue-900 border-blue-300',
  'bg-emerald-100 text-emerald-900 border-emerald-300',
  'bg-amber-100 text-amber-900 border-amber-300',
  'bg-violet-100 text-violet-900 border-violet-300',
  'bg-rose-100 text-rose-900 border-rose-300',
  'bg-teal-100 text-teal-900 border-teal-300',
];

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}
function toRow(t: string) {
  return Math.max(0, Math.round((toMinutes(t) - START_HOUR * 60) / (60 / ROWS_PER_HOUR)));
}

interface Props { enrollments: any[]; }

export function WeeklyScheduleGrid({ enrollments }: Props) {
  const blocks: { day: number; slot: any; e: any; color: string }[] = [];
  enrollments.forEach((e, idx) => {
    const color = PALETTE[idx % PALETTE.length];
    (e.class?.schedule ?? []).forEach((s: any) => blocks.push({ day: s.day, slot: s, e, color }));
  });

  const hourLabels = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  return (
    <Card>
      <CardContent className="p-0">
        {/* Desktop grid */}
        <div className="hidden md:block overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Header */}
            <div className="grid border-b bg-muted/40" style={{ gridTemplateColumns: '60px repeat(6, 1fr)' }}>
              <div />
              {DAYS.map((d) => (
                <div key={d.idx} className="py-2 text-center text-xs font-semibold text-muted-foreground border-l">{d.label}</div>
              ))}
            </div>
            {/* Body: grid with rows */}
            <div
              className="grid relative"
              style={{
                gridTemplateColumns: '60px repeat(6, 1fr)',
                gridTemplateRows: `repeat(${TOTAL_ROWS}, ${ROW_PX}px)`,
              }}
            >
              {/* Hour labels — every 2 rows */}
              {hourLabels.map((h, i) => (
                <div
                  key={`h-${h}`}
                  className="text-[10px] text-muted-foreground text-right pr-2 border-b border-r"
                  style={{ gridColumn: 1, gridRow: `${i * ROWS_PER_HOUR + 1} / span ${ROWS_PER_HOUR}` }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
              {/* Day columns background lines */}
              {DAYS.map((d, di) =>
                hourLabels.map((h, i) => (
                  <div
                    key={`bg-${d.idx}-${h}`}
                    className="border-b border-l"
                    style={{ gridColumn: di + 2, gridRow: `${i * ROWS_PER_HOUR + 1} / span ${ROWS_PER_HOUR}` }}
                  />
                )),
              )}
              {/* Blocks */}
              {blocks.map((b, i) => {
                const dayCol = DAYS.findIndex((d) => d.idx === b.day);
                if (dayCol < 0) return null;
                const rowStart = toRow(b.slot.start) + 1;
                const rowEnd = toRow(b.slot.end) + 1;
                return (
                  <div
                    key={i}
                    className={cn('m-0.5 rounded-md border px-2 py-1 shadow-sm text-[11px] font-medium overflow-hidden z-10', b.color)}
                    style={{ gridColumn: dayCol + 2, gridRow: `${rowStart} / ${rowEnd}` }}
                  >
                    <div className="font-bold leading-tight truncate">{b.e.class?.subject?.name ?? b.e.class?.name}</div>
                    <div className="text-[10px] opacity-80 truncate">{b.slot.start}–{b.slot.end}</div>
                    <div className="text-[10px] opacity-80 truncate">{b.e.class?.room ?? ''}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile list per day */}
        <div className="md:hidden divide-y">
          {DAYS.map((d) => {
            const items = blocks
              .filter((b) => b.day === d.idx)
              .sort((a, b) => toMinutes(a.slot.start) - toMinutes(b.slot.start));
            return (
              <div key={d.idx} className="p-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2">{d.label}</div>
                {items.length === 0 && <div className="text-xs text-muted-foreground italic">Sem aulas</div>}
                <div className="space-y-2">
                  {items.map((b, i) => (
                    <div key={i} className={cn('rounded-md border px-3 py-2', b.color)}>
                      <div className="text-sm font-bold">{b.e.class?.subject?.name ?? b.e.class?.name}</div>
                      <div className="text-xs opacity-80">{b.slot.start}–{b.slot.end} · {b.e.class?.room}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
