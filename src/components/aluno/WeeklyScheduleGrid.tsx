import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const DAYS = [
  { idx: 1, label: 'Segunda' },
  { idx: 2, label: 'Terça' },
  { idx: 3, label: 'Quarta' },
  { idx: 4, label: 'Quinta' },
  { idx: 5, label: 'Sexta' },
  { idx: 6, label: 'Sábado' },
];

// Hourly rows from 07 to 22
const HOURS = Array.from({ length: 16 }, (_, i) => 7 + i);

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

interface Props {
  enrollments: any[];
}

export function WeeklyScheduleGrid({ enrollments }: Props) {
  // Build block map: day -> array of {enrollment, slot, colorIdx}
  const blocks: { day: number; slot: any; e: any; color: string }[] = [];
  enrollments.forEach((e, idx) => {
    const color = PALETTE[idx % PALETTE.length];
    (e.class?.schedule ?? []).forEach((s: any) => blocks.push({ day: s.day, slot: s, e, color }));
  });

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        {/* Desktop grid */}
        <div className="hidden md:block min-w-[720px]">
          <div className="grid" style={{ gridTemplateColumns: '60px repeat(6, 1fr)' }}>
            <div className="border-b bg-muted/40" />
            {DAYS.map((d) => (
              <div key={d.idx} className="border-b bg-muted/40 py-2 px-2 text-center text-xs font-semibold text-muted-foreground">
                {d.label}
              </div>
            ))}
          </div>
          <div className="relative grid" style={{ gridTemplateColumns: '60px repeat(6, 1fr)' }}>
            {/* Hour labels + empty cells */}
            {HOURS.map((h) => (
              <>
                <div key={`h-${h}`} className="text-[10px] text-muted-foreground border-r border-b px-1 py-0.5 text-right pr-2 h-14">
                  {String(h).padStart(2, '0')}:00
                </div>
                {DAYS.map((d) => (
                  <div key={`c-${d.idx}-${h}`} className="border-r border-b h-14" />
                ))}
              </>
            ))}

            {/* Blocks positioned absolutely */}
            {blocks.map((b, i) => {
              const startMin = toMinutes(b.slot.start);
              const endMin = toMinutes(b.slot.end);
              const startFromTop = ((startMin - 7 * 60) / 60) * 56 + 24; // 56px per hour + header offset ~24
              const height = ((endMin - startMin) / 60) * 56;
              const dayIdx = DAYS.findIndex((d) => d.idx === b.day);
              if (dayIdx < 0) return null;
              const leftPct = (100 / 6) * dayIdx;
              return (
                <div
                  key={i}
                  className={cn('absolute rounded-md border px-2 py-1 shadow-sm text-[11px] font-medium overflow-hidden', b.color)}
                  style={{
                    top: startFromTop,
                    height: Math.max(height - 4, 24),
                    left: `calc(60px + ${leftPct}% * (100% - 60px) / 100%)`,
                    width: `calc((100% - 60px) / 6 - 6px)`,
                    marginLeft: 2,
                  }}
                >
                  <div className="font-bold leading-tight truncate">{b.e.class?.subject?.name ?? b.e.class?.name}</div>
                  <div className="text-[10px] opacity-80 truncate">{b.slot.start}–{b.slot.end}</div>
                  <div className="text-[10px] opacity-80 truncate">{b.e.class?.room ?? ''}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile list per day */}
        <div className="md:hidden divide-y">
          {DAYS.map((d) => {
            const items = blocks.filter((b) => b.day === d.idx).sort((a, b) => toMinutes(a.slot.start) - toMinutes(b.slot.start));
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
