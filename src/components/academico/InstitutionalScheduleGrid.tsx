import { Fragment } from 'react';
import unigLogo from '@/assets/uniga-logo.png';

export type InstitutionalClass = { day: number; start: string; end: string; subject: string; professor?: string; room?: string; ead?: boolean };
export type InstitutionalSchedule = { course: string; classCode: string; semester: string; academicPeriod: string; shift: string; entries: InstitutionalClass[] };

const DAYS = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA'];
const TIME_SLOTS: Record<string, string[][]> = {
  MANHÃ: [['07:10', '08:00'], ['08:00', '08:50'], ['08:50', '09:40'], ['09:50', '10:40'], ['10:40', '11:30'], ['11:30', '12:20']],
  TARDE: [['13:10', '14:00'], ['14:00', '14:50'], ['14:50', '15:40'], ['15:50', '16:40'], ['16:40', '17:30'], ['17:30', '18:20']],
  NOITE: [['18:30', '19:20'], ['19:20', '20:10'], ['20:20', '21:10'], ['21:10', '22:00']],
  INTEGRAL: [['07:10', '08:00'], ['08:00', '08:50'], ['08:50', '09:40'], ['09:50', '10:40'], ['13:10', '14:00'], ['14:00', '14:50']],
  EAD: [['08:00', '08:50'], ['08:50', '09:40'], ['19:20', '20:10'], ['20:20', '21:10']],
};
const slotsFor = (shift: string) => TIME_SLOTS[shift] ?? TIME_SLOTS.MANHÃ;
const isIntervalAfter = (index: number, shift: string) => (shift === 'NOITE' || shift === 'EAD') ? index === 2 : index === 3;
const intervalLabel = (shift: string) => shift === 'NOITE' || shift === 'EAD' ? 'INTERVALO · 20:10 – 20:20' : shift === 'TARDE' ? 'INTERVALO · 15:40 – 15:50' : 'INTERVALO · 09:40 – 09:50';

export function InstitutionalScheduleGrid({ schedule }: { schedule: InstitutionalSchedule }) {
  const slots = slotsFor(schedule.shift);
  const entriesForDay = (day: number) => schedule.entries.filter((entry) => !entry.ead && entry.day === day).sort((a, b) => a.start.localeCompare(b.start));
  const entryFor = (day: number, slot: string[]) => entriesForDay(day).find((entry) => entry.start === slot[0] && entry.end === slot[1]);
  const eadEntries = schedule.entries.filter((entry) => entry.ead);
  return <section className="rounded-lg border bg-white p-3 shadow-sm print:border-0 print:p-0 print:shadow-none">
    <div className="hidden min-w-[900px] text-slate-950 md:block"><ScheduleHeader schedule={schedule} /><table className="w-full table-fixed border-collapse text-center text-xs"><thead><tr className="bg-[#c8c09b] text-sm font-extrabold"><th className="w-[125px] border border-slate-700 py-2">HORÁRIO</th>{DAYS.map((day) => <th key={day} className="border border-slate-700 py-2">{day}</th>)}<th className="w-[115px] border border-slate-700 py-2">EAD</th></tr><tr className="bg-slate-100 text-[11px] font-bold uppercase"><th className="border border-slate-700 py-1">{schedule.shift}</th>{DAYS.map((day) => <th key={day} className="border border-slate-700 py-1">{schedule.shift}</th>)}<th className="border border-slate-700 py-1">ATIVIDADES</th></tr></thead><tbody>{slots.map((slot, index) => <Fragment key={slot.join('-')} >{isIntervalAfter(index, schedule.shift) && <tr><td colSpan={7} className="border border-slate-700 bg-sky-100 py-1 font-extrabold">{intervalLabel(schedule.shift)}</td></tr>}<tr className="h-[74px]"><th className="border border-slate-700 bg-sky-100 px-1 text-[11px] font-extrabold">{slot[0]} – {slot[1]}</th>{DAYS.map((_, dayIndex) => { const entry = entryFor(dayIndex + 1, slot); return <td key={dayIndex} className="border border-slate-700 px-1 align-middle">{entry ? <ClassInfo entry={entry} /> : <span className="text-[10px] text-slate-400">VAGO</span>}</td>; })}{index === 0 && <td rowSpan={slots.length + 1} className="border border-slate-700 bg-[#37869b] px-2 align-middle text-white">{eadEntries.length ? <div className="space-y-4">{eadEntries.map((entry, i) => <ClassInfo key={i} entry={entry} />)}</div> : <span className="text-[10px]">Sem atividade EAD</span>}</td>}</tr></Fragment>)}</tbody></table></div>
    <div className="md:hidden"><ScheduleHeader schedule={schedule} compact /><div className="space-y-3">{DAYS.map((day, index) => <div key={day} className="rounded-md border"><div className="bg-[#c8c09b] px-3 py-2 text-xs font-extrabold">{day}</div><div className="divide-y">{entriesForDay(index + 1).length ? entriesForDay(index + 1).map((entry, i) => <div key={i} className="flex gap-3 px-3 py-3"><span className="w-24 shrink-0 text-xs font-bold text-sky-800">{entry.start} – {entry.end}</span><ClassInfo entry={entry} /></div>) : <p className="px-3 py-3 text-xs text-slate-400">Sem aulas programadas.</p>}</div></div>)}</div><div className="mt-3 rounded-md border border-[#37869b] bg-[#37869b] p-3 text-white"><p className="mb-2 text-xs font-extrabold">ATIVIDADES EAD</p>{eadEntries.length ? <div className="space-y-3">{eadEntries.map((entry, i) => <ClassInfo key={i} entry={entry} />)}</div> : <p className="text-xs">Sem atividade EAD.</p>}</div></div>
  </section>;
}
function ScheduleHeader({ schedule, compact = false }: { schedule: InstitutionalSchedule; compact?: boolean }) { return <header className={`mb-4 ${compact ? 'text-center' : 'grid grid-cols-[170px_1fr] items-center gap-4 px-2'}`}><img src={unigLogo} alt="UNIG" className={compact ? 'mx-auto mb-3 h-12 w-auto object-contain' : 'max-h-16 max-w-[150px] object-contain object-left'} /><div className="text-center leading-tight"><h2 className="text-lg font-extrabold uppercase">Curso de {schedule.course}</h2><p className="mt-1 text-xs font-bold uppercase">{schedule.classCode} · {schedule.semester}</p><p className="text-xs font-bold uppercase">{schedule.academicPeriod} · {schedule.shift}</p></div></header>; }
function ClassInfo({ entry }: { entry: InstitutionalClass }) { return <div className="leading-tight"><div className="font-extrabold uppercase">{entry.subject}</div>{entry.professor && <div className="mt-1 text-[11px] font-semibold uppercase">{entry.professor}</div>}{entry.room && <div className="mt-1 text-[10px] font-bold uppercase">{entry.room}</div>}</div>; }
