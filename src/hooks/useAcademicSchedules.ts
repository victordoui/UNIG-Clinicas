import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InstitutionalSchedule } from '@/components/academico/InstitutionalScheduleGrid';

type MeetingRow = {
  id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
  status: string;
  class: { id: string; code: string; name: string; subject: { name: string } | null } | null;
  professor: { id: string; full_name: string } | null;
  room: { id: string; code: string; name: string } | null;
};

type ScheduleRow = {
  id: string;
  name: string;
  status: string;
  unit_id: string;
  academic_period: string;
  course: { id: string; name: string } | null;
  meetings: MeetingRow[] | null;
};

export type AcademicMeeting = {
  id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  class: { id: string; code: string; name: string; capacity: number; enrolled_count: number; subject: { name: string } | null } | null;
  professor: { full_name: string } | null;
  room: { id: string; code: string; name: string; capacity: number; status: string } | null;
  schedule: { id: string; name: string; academic_period: string; status: string; course: { name: string } | null } | null;
};

function toClock(value: string) { return value.slice(0, 5); }

function inferShift(meetings: MeetingRow[], scheduleName = '') {
  const firstStart = meetings
    .filter((meeting) => meeting.weekday !== 7 && meeting.status !== 'cancelled')
    .map((meeting) => Number(meeting.starts_at.slice(0, 2)))
    .sort((a, b) => a - b)[0];
  if (firstStart === undefined) {
    if (scheduleName.toUpperCase().includes('NOITE')) return 'NOITE';
    if (scheduleName.toUpperCase().includes('TARDE')) return 'TARDE';
    return 'MANHÃ';
  }
  if (firstStart < 12) return 'MANHÃ';
  if (firstStart < 18) return 'TARDE';
  return 'NOITE';
}

function toInstitutionalSchedule(row: ScheduleRow): InstitutionalSchedule {
  const meetings = (row.meetings ?? []).filter((meeting) => meeting.status !== 'cancelled');
  const primaryClass = meetings[0]?.class;
  return {
    id: row.id,
    status: row.status,
    unitId: row.unit_id,
    courseId: row.course?.id,
    course: row.course?.name ?? 'Curso não informado',
    classCode: primaryClass?.code ?? row.name,
    semester: primaryClass?.name ?? row.name,
    academicPeriod: row.academic_period,
    shift: inferShift(meetings, row.name),
    entries: meetings.map((meeting) => ({
      id: meeting.id,
      classId: meeting.class?.id,
      professorId: meeting.professor?.id,
      roomId: meeting.room?.id,
      status: meeting.status,
      day: meeting.weekday,
      start: toClock(meeting.starts_at),
      end: toClock(meeting.ends_at),
      subject: meeting.class?.subject?.name ?? meeting.class?.name ?? 'Disciplina não informada',
      professor: meeting.professor?.full_name,
      room: meeting.room ? `${meeting.room.code} · ${meeting.room.name}` : undefined,
      ead: meeting.weekday === 7,
    })),
  };
}

export function usePublishedAcademicSchedules(includeDrafts = false) {
  return useQuery({
    queryKey: ['academic-schedules', includeDrafts ? 'managed' : 'published'],
    queryFn: async () => {
      let query = supabase
        .from('academic_schedules' as never)
        .select('id, name, status, unit_id, academic_period, course:courses(id, name), meetings:class_meetings(id, weekday, starts_at, ends_at, status, class:classes(id, code, name, subject:subjects(name)), professor:professors(id, full_name), room:rooms(id, code, name))');
      if (!includeDrafts) query = query.eq('status', 'published');
      const { data, error } = await query.order('academic_period', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as ScheduleRow[])
        .map(toInstitutionalSchedule);
    },
  });
}

export type AcademicMeetingValues = {
  academic_schedule_id: string;
  class_id: string;
  professor_id: string | null;
  room_id: string | null;
  weekday: number;
  starts_at: string;
  ends_at: string;
  status: 'planned' | 'published';
  notes?: string | null;
};

export function useUpsertAcademicMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: AcademicMeetingValues }) => {
      const table = supabase.from('class_meetings' as never) as any;
      const operation = id ? table.update(values).eq('id', id) : table.insert(values);
      const { data, error } = await operation.select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['academic-meetings'] });
    },
  });
}

export function useCancelAcademicMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('class_meetings' as never) as any).update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['academic-meetings'] });
    },
  });
}

export type AcademicScheduleValues = {
  unit_id: string;
  course_id: string | null;
  academic_period: string;
  name: string;
  starts_on?: string | null;
  ends_on?: string | null;
};

export function useCreateAcademicSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: AcademicScheduleValues) => {
      const { data, error } = await (supabase.from('academic_schedules' as never) as any)
        .insert({ ...values, status: 'draft' })
        .select()
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-schedules'] }),
  });
}

export function useAcademicMeetings() {
  return useQuery({
    queryKey: ['academic-meetings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_meetings' as never)
        .select('id, weekday, starts_at, ends_at, status, notes, class:classes(id, code, name, capacity, enrolled_count, subject:subjects(name)), professor:professors(full_name), room:rooms(id, code, name, capacity, status), schedule:academic_schedules(id, name, academic_period, status, course:courses(name))')
        .neq('status', 'cancelled')
        .order('weekday')
        .order('starts_at');
      if (error) throw error;
      return (data ?? []) as unknown as AcademicMeeting[];
    },
  });
}

export function useAcademicScheduleVersions() {
  return useQuery({
    queryKey: ['academic-schedule-versions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_schedule_versions' as never)
        .select('id, version, action, created_at, schedule:academic_schedules(name, academic_period, course:courses(name))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
