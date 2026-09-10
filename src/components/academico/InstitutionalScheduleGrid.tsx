import { Fragment } from 'react';
import { Pencil, Plus } from 'lucide-react';
import unigLogo from '@/assets/unig-clinicas-logo.png';
import { cn } from '@/lib/utils';

export type InstitutionalClass = {
  id?: string;
  classId?: string;
  professorId?: string;
  roomId?: string;
  status?: string;
  day: number;
  start: string;
  end: string;
  subject: string;
  professor?: string;
  room?: string;
  ead?: boolean;
};

export type InstitutionalSchedule = {
  id?: string;
  status?: string;
  unitId?: string;
  courseId?: string;
  course: string;
  classCode: string;
  semester: string;
  academicPeriod: string;
  shift: string;
  entries: InstitutionalClass[];
};

type SlotSelection = { day: number; start: string; end: string; ead?: boolean };

interface InstitutionalScheduleGridProps {
  schedule: InstitutionalSchedule;
  editable?: boolean;
  onEntryClick?: (entry: InstitutionalClass) => void;
  onEmptySlotClick?: (slot: SlotSelection) => void;
}

const days = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA'];
const slots: Record<string, string[][]> = {
  MANHÃ: [['07:10', '08:00'], ['08:00', '08:50'], ['08:50', '09:40'], ['09:50', '10:40'], ['10:40', '11:30'], ['11:30', '12:20']],
  TARDE: [['13:10', '14:00'], ['14:00', '14:50'], ['14:50', '15:40'], ['15:50', '16:40'], ['16:40', '17:30'], ['17:30', '18:20']],
  NOITE: [['18:30', '19:20'], ['19:20', '20:10'], ['20:20', '21:10'], ['21:10', '22:00']],
};

export function InstitutionalScheduleGrid({ schedule, editable, onEntryClick, onEmptySlotClick }: InstitutionalScheduleGridProps) {
  const timeSlots = slots[schedule.shift] ?? slots.MANHÃ;
  const entryAt = (day: number, time: string[]) => schedule.entries.find((item) => !item.ead && item.day === day && item.start === time[0] && item.end === time[1]);
  const eadEntries = schedule.entries.filter((item) => item.ead);

  const renderSlot = (day: number, time: string[], item?: InstitutionalClass) => {
    const content = item ? <Info item={item} /> : <span className="text-[10px] text-slate-400">VAGO</span>;
    if (!editable) return content;
    return (
      <button
        type="button"
        onClick={() => item ? onEntryClick?.(item) : onEmptySlotClick?.({ day, start: time[0], end: time[1] })}
        className="group/slot relative flex h-full min-h-[58px] w-full items-center justify-center rounded-md px-1 py-1 outline-none transition-colors hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={item ? `Editar ${item.subject}` : `Adicionar aula em ${days[day - 1]}, ${time[0]}`}
      >
        {content}
        {item ? <Pencil className="absolute right-1 top-1 h-3.5 w-3.5 text-primary opacity-0 transition-opacity group-hover/slot:opacity-100" /> : <Plus className="absolute bottom-1 right-1 h-3.5 w-3.5 text-primary/60" />}
      </button>
    );
  };

  return (
    <section className="schedule-print-area rounded-xl border bg-white p-3 shadow-sm print:border-0 print:p-0 print:shadow-none">
      <header className="mb-4 grid grid-cols-[80px_1fr_80px] items-center gap-2 px-1 text-slate-950 sm:grid-cols-[170px_1fr_170px] sm:gap-4 sm:px-2">
        <img src={unigLogo} alt="UNIG Clínicas" className="max-h-16 max-w-[220px] object-contain" />
        <div className="text-center">
          <h2 className="text-sm font-extrabold uppercase sm:text-lg">Curso de {schedule.course}</h2>
          <p className="text-[10px] font-bold sm:text-xs">{schedule.classCode} · {schedule.semester}</p>
          <p className="text-[10px] font-bold sm:text-xs">{schedule.academicPeriod} · {schedule.shift}</p>
        </div>
        <div className="text-right text-[9px] font-medium uppercase text-slate-500 sm:text-[10px]">Grade semanal</div>
      </header>

      <div className="hidden overflow-x-auto md:block print:block">
        <table className="w-full min-w-[900px] table-fixed border-collapse text-center text-xs text-slate-950">
          <thead>
            <tr className="bg-[#c8c09b] text-sm font-extrabold">
              <th className="w-[125px] border border-slate-700 py-2">HORÁRIO</th>
              {days.map((day) => <th key={day} className="border border-slate-700 py-2">{day}</th>)}
              <th className="w-[115px] border border-slate-700 py-2">EAD</th>
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((time, index) => (
              <Fragment key={time.join('-')}>
                <tr className="h-[74px]">
                  <th className="border border-slate-700 bg-sky-100 px-1">{time[0]} – {time[1]}</th>
                  {days.map((_, dayIndex) => {
                    const item = entryAt(dayIndex + 1, time);
                    return <td key={dayIndex} className={cn('border border-slate-700 p-0.5', editable && 'bg-sky-50/20')}>{renderSlot(dayIndex + 1, time, item)}</td>;
                  })}
                  {index === 0 && (
                    <td rowSpan={timeSlots.length} className="border border-slate-700 bg-[#37869b] px-2 text-white">
                      {eadEntries.map((item) => (
                        <button key={item.id ?? item.subject} type="button" disabled={!editable} onClick={() => onEntryClick?.(item)} className="w-full rounded-md p-1 disabled:cursor-default">
                          <Info item={item} />
                        </button>
                      ))}
                      {editable && eadEntries.length === 0 && (
                        <button type="button" onClick={() => onEmptySlotClick?.({ day: 7, start: '00:01', end: '23:59', ead: true })} className="flex w-full flex-col items-center gap-1 rounded-md border border-dashed border-white/60 py-3 text-[10px] font-bold hover:bg-white/10">
                          <Plus className="h-4 w-4" />Adicionar EAD
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden print:hidden">
        {days.map((day, dayIndex) => (
          <article key={day} className="overflow-hidden rounded-xl border border-slate-200">
            <h3 className="bg-[#c8c09b] px-3 py-2 text-center text-xs font-extrabold text-slate-950">{day}</h3>
            <div className="divide-y divide-slate-200">
              {timeSlots.map((time) => {
                const item = entryAt(dayIndex + 1, time);
                return (
                  <div key={time.join('-')} className="grid min-h-[70px] grid-cols-[90px_1fr] items-stretch">
                    <div className="flex items-center justify-center bg-sky-50 px-2 text-center text-[11px] font-bold text-slate-800">{time[0]}<br />{time[1]}</div>
                    <div className="flex items-center justify-center p-1 text-center text-xs">{renderSlot(dayIndex + 1, time, item)}</div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
        <article className="rounded-xl bg-[#37869b] p-3 text-center text-xs text-white">
          <h3 className="mb-2 font-extrabold">EAD</h3>
          {eadEntries.map((item) => <button key={item.id ?? item.subject} type="button" disabled={!editable} onClick={() => onEntryClick?.(item)} className="w-full rounded-md p-1 disabled:cursor-default"><Info item={item} /></button>)}
          {editable && eadEntries.length === 0 && <button type="button" onClick={() => onEmptySlotClick?.({ day: 7, start: '00:01', end: '23:59', ead: true })} className="mx-auto flex items-center gap-1 rounded-lg border border-dashed border-white/60 px-3 py-2"><Plus className="h-4 w-4" />Adicionar disciplina EAD</button>}
        </article>
      </div>
    </section>
  );
}

function Info({ item }: { item: InstitutionalClass }) {
  return (
    <div className="mb-3 leading-tight last:mb-0">
      <div className="font-extrabold uppercase">{item.subject}</div>
      {item.professor && <div className="mt-1 text-[11px] font-semibold uppercase">{item.professor}</div>}
      {item.room && <div className="mt-1 text-[10px] font-bold uppercase">{item.room}</div>}
    </div>
  );
}
