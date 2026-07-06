import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Assessment, AttendanceStatus } from '@/lib/grades';
import { toast } from '@/hooks/use-toast';

/** Professor: turmas que leciona (pelo email). */
export function useProfessorClasses() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['professor-classes', profile?.email],
    enabled: !!profile?.email,
    queryFn: async () => {
      const { data: prof, error: pErr } = await supabase
        .from('professors')
        .select('id')
        .eq('email', profile!.email)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!prof) return [];
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id, code, name, academic_period, shift, room, schedule, enrolled_count, capacity, status,
          subject:subjects(id, code, name),
          course:courses(id, code, name),
          unit:units(id, code, name)
        `)
        .eq('professor_id', prof.id)
        .order('academic_period', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Roster de uma turma com alunos, notas e presenças. */
export function useClassRoster(classId?: string) {
  return useQuery({
    queryKey: ['class-roster', classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          id, status, student:students(id, registration, full_name, email)
        `)
        .eq('class_id', classId!)
        .order('enrolled_at');
      if (error) throw error;
      const ids = (enrollments ?? []).map((e: any) => e.id);
      if (ids.length === 0) return { enrollments: [], grades: [], attendance: [] };
      const [gRes, aRes] = await Promise.all([
        supabase.from('grades').select('*').in('enrollment_id', ids),
        supabase.from('attendance_records').select('*').in('enrollment_id', ids),
      ]);
      if (gRes.error) throw gRes.error;
      if (aRes.error) throw aRes.error;
      return { enrollments: enrollments ?? [], grades: gRes.data ?? [], attendance: aRes.data ?? [] };
    },
  });
}

/** Boletim do aluno: matrículas + notas + presenças + info da turma/disciplina. */
export function useStudentReport(studentId?: string) {
  return useQuery({
    queryKey: ['student-report', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          id, status,
          class:classes(
            id, code, name, academic_period,
            subject:subjects(id, code, name, workload_hours),
            professor:professors(id, full_name)
          )
        `)
        .eq('student_id', studentId!);
      if (error) throw error;
      const ids = (enrollments ?? []).map((e: any) => e.id);
      if (ids.length === 0) return { enrollments: [], grades: [], attendance: [] };
      const [gRes, aRes] = await Promise.all([
        supabase.from('grades').select('*').in('enrollment_id', ids).not('released_at', 'is', null),
        supabase.from('attendance_records').select('*').in('enrollment_id', ids),
      ]);
      if (gRes.error) throw gRes.error;
      if (aRes.error) throw aRes.error;
      return { enrollments: enrollments ?? [], grades: gRes.data ?? [], attendance: aRes.data ?? [] };
    },
  });
}

export function useUpsertGrade() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      enrollment_id: string;
      assessment: Assessment;
      score: number | null;
      release?: boolean;
    }) => {
      const payload: any = {
        enrollment_id: input.enrollment_id,
        assessment: input.assessment,
        score: input.score,
      };
      if (input.release) {
        payload.released_at = new Date().toISOString();
        payload.released_by = user?.id ?? null;
      }
      const { error } = await supabase
        .from('grades')
        .upsert(payload, { onConflict: 'enrollment_id,assessment' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['class-roster'] }),
    onError: (e: any) => toast({ title: 'Erro ao salvar nota', description: e.message, variant: 'destructive' }),
  });
}

export function usePublishGrades() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (gradeIds: string[]) => {
      if (gradeIds.length === 0) return;
      const { error } = await supabase
        .from('grades')
        .update({ released_at: new Date().toISOString(), released_by: user?.id ?? null })
        .in('id', gradeIds);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class-roster'] });
      toast({ title: 'Notas publicadas', description: 'Os alunos já podem visualizar.' });
    },
    onError: (e: any) => toast({ title: 'Erro ao publicar', description: e.message, variant: 'destructive' }),
  });
}

export function useUpsertAttendance() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (rows: { enrollment_id: string; class_date: string; status: AttendanceStatus; hours?: number }[]) => {
      if (rows.length === 0) return;
      const payload = rows.map((r) => ({
        enrollment_id: r.enrollment_id,
        class_date: r.class_date,
        status: r.status,
        hours: r.hours ?? 2,
        recorded_by: user?.id ?? null,
      }));
      const { error } = await supabase
        .from('attendance_records')
        .upsert(payload, { onConflict: 'enrollment_id,class_date' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['class-roster'] });
      toast({ title: 'Presença registrada' });
    },
    onError: (e: any) => toast({ title: 'Erro ao registrar', description: e.message, variant: 'destructive' }),
  });
}
