import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InstitutionalSchedule } from '@/components/academico/InstitutionalScheduleGrid';

type MeetingRow = {
  weekday: number;
  starts_at: string;
  ends_at: string;
  class: { code: string; name: string; subject: { name: string } | null } | null;
  professor: { full_name: string } | null;
  room: { code: string; name: string } | null;
};

type ScheduleRow = {
  id: string;
  academic_period: string;
  course: { name: string } | null;
  meetings: MeetingRow[] | null;
};

function toClock(value: string) { return value.slice(0, 5); }

function toInstitutionalSchedule(row: ScheduleRow): InstitutionalSchedule | null {
  const meetings = row.meetings ?? [];
  const primaryClass = meetings[0]?.class;
  if (!primaryClass) return null;
  return {
    course: row.course?.name ?? 'Curso não informado',
    classCode: primaryClass.code,
    semester: primaryClass.name,
    academicPeriod: row.academic_period,
    shift: 'MANHÃ',
    entries: meetings.map((meeting) => ({
      day: meeting.weekday,
      start: toClock(meeting.starts_at),
      end: toClock(meeting.ends_at),
      subject: meeting.class?.subject?.name ?? meeting.class?.name ?? 'Disciplina não informada',
      professor: meeting.professor?.full_name,
      room: meeting.room ? `${meeting.room.code} · ${meeting.room.name}` : undefined,
    })),
  };
}

export function usePublishedAcademicSchedules() {
  return useQuery({
    queryKey: ['academic-schedules', 'published'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_schedules' as never)
        .select('id, academic_period, course:courses(name), meetings:class_meetings(weekday, starts_at, ends_at, class:classes(code, name, subject:subjects(name)), professor:professors(full_name), room:rooms(code, name))')
        .eq('status', 'published');
      if (error) throw error;
      return ((data ?? []) as unknown as ScheduleRow[])
        .map(toInstitutionalSchedule)
        .filter((schedule): schedule is InstitutionalSchedule => schedule !== null);
    },
  });
}
