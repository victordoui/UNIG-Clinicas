import type { AcademicMeeting } from '@/hooks/useAcademicSchedules';
import { Badge } from '@/components/ui/badge';

const WEEKDAYS = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const clock = (value: string) => value.slice(0, 5);

export function AcademicMeetingTable({ meetings }: { meetings: AcademicMeeting[] }) {
  if (!meetings.length) return <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma aula cadastrada para esta grade.</p>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Aula</th><th className="px-4 py-3">Horário</th><th className="px-4 py-3">Professor</th><th className="px-4 py-3">Sala</th><th className="px-4 py-3">Ocupação</th></tr></thead><tbody className="divide-y">{meetings.map((meeting) => <tr key={meeting.id} className="transition-colors hover:bg-muted/40"><td className="px-4 py-3"><p className="font-medium">{meeting.class?.subject?.name ?? meeting.class?.name ?? 'Disciplina não informada'}</p><p className="text-xs text-muted-foreground">{meeting.class?.code}</p></td><td className="px-4 py-3"><Badge variant="secondary">{WEEKDAYS[meeting.weekday]}</Badge><p className="mt-1 text-xs text-muted-foreground">{clock(meeting.starts_at)} – {clock(meeting.ends_at)}</p></td><td className="px-4 py-3">{meeting.professor?.full_name ?? <span className="text-destructive">Pendente</span>}</td><td className="px-4 py-3">{meeting.room ? <><p className="font-medium">{meeting.room.code}</p><p className="text-xs text-muted-foreground">{meeting.room.name}</p></> : <span className="text-destructive">Sem sala</span>}</td><td className="px-4 py-3">{meeting.class && meeting.room ? `${meeting.class.enrolled_count}/${meeting.room.capacity}` : '—'}</td></tr>)}</tbody></table></div>;
}
