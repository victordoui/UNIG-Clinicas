import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type Table = 'students' | 'professors' | 'courses' | 'subjects' | 'classes' | 'units' | 'enrollments';

// ---------- Units ----------
export function useUnits() {
  return useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('*').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------- Students ----------
export interface StudentFilters { search?: string; courseId?: string; unitId?: string; status?: string; }
export function useStudents(filters: StudentFilters = {}) {
  return useQuery({
    queryKey: ['students', filters],
    queryFn: async () => {
      let q = supabase.from('students').select('*, course:courses(id,name,code), unit:units(id,name,code)');
      if (filters.courseId && filters.courseId !== 'all') q = q.eq('course_id', filters.courseId);
      if (filters.unitId && filters.unitId !== 'all') q = q.eq('unit_id', filters.unitId);
      if (filters.status && filters.status !== 'all') q = q.eq('enrollment_status', filters.status);
      if (filters.search) q = q.or(`full_name.ilike.%${filters.search}%,registration.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      const { data, error } = await q.order('full_name').limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------- Professors ----------
export interface ProfessorFilters { search?: string; unitId?: string; department?: string; }
export function useProfessors(filters: ProfessorFilters = {}) {
  return useQuery({
    queryKey: ['professors', filters],
    queryFn: async () => {
      let q = supabase.from('professors').select('*, unit:units(id,name,code)');
      if (filters.unitId && filters.unitId !== 'all') q = q.eq('unit_id', filters.unitId);
      if (filters.department && filters.department !== 'all') q = q.eq('department', filters.department);
      if (filters.search) q = q.or(`full_name.ilike.%${filters.search}%,registration.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      const { data, error } = await q.order('full_name').limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------- Courses ----------
export interface CourseFilters { search?: string; unitId?: string; modality?: string; degreeType?: string; }
export function useCourses(filters: CourseFilters = {}) {
  return useQuery({
    queryKey: ['courses', filters],
    queryFn: async () => {
      let q = supabase.from('courses').select('*, unit:units(id,name,code)');
      if (filters.unitId && filters.unitId !== 'all') q = q.eq('unit_id', filters.unitId);
      if (filters.modality && filters.modality !== 'all') q = q.eq('modality', filters.modality);
      if (filters.degreeType && filters.degreeType !== 'all') q = q.eq('degree_type', filters.degreeType);
      if (filters.search) q = q.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      const { data, error } = await q.order('name').limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------- Subjects ----------
export interface SubjectFilters { search?: string; courseId?: string; semester?: number; }
export function useSubjects(filters: SubjectFilters = {}) {
  return useQuery({
    queryKey: ['subjects', filters],
    queryFn: async () => {
      let q = supabase.from('subjects').select('*, course:courses(id,name,code), professor:professors(id,full_name)');
      if (filters.courseId && filters.courseId !== 'all') q = q.eq('course_id', filters.courseId);
      if (filters.semester) q = q.eq('semester', filters.semester);
      if (filters.search) q = q.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      const { data, error } = await q.order('semester').order('name').limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------- Classes ----------
export interface ClassFilters { search?: string; period?: string; courseId?: string; subjectId?: string; professorId?: string; unitId?: string; shift?: string; }
export function useClasses(filters: ClassFilters = {}) {
  return useQuery({
    queryKey: ['classes', filters],
    queryFn: async () => {
      let q = supabase.from('classes').select('*, subject:subjects(id,name,code), professor:professors(id,full_name), course:courses(id,name,code), unit:units(id,name,code)');
      if (filters.courseId && filters.courseId !== 'all') q = q.eq('course_id', filters.courseId);
      if (filters.subjectId && filters.subjectId !== 'all') q = q.eq('subject_id', filters.subjectId);
      if (filters.professorId && filters.professorId !== 'all') q = q.eq('professor_id', filters.professorId);
      if (filters.unitId && filters.unitId !== 'all') q = q.eq('unit_id', filters.unitId);
      if (filters.shift && filters.shift !== 'all') q = q.eq('shift', filters.shift);
      if (filters.period && filters.period !== 'all') q = q.eq('academic_period', filters.period);
      if (filters.search) q = q.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      const { data, error } = await q.order('academic_period', { ascending: false }).order('name').limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------- Class enrollments ----------
export function useClassEnrollments(classId?: string) {
  return useQuery({
    queryKey: ['class-enrollments', classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, status, enrolled_at, student:students(id, full_name, registration, email)')
        .eq('class_id', classId!)
        .order('enrolled_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------- Generic mutations ----------
export function useUpsert<T extends Record<string, any>>(table: Table, invalidateKeys: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; values: T }) => {
      const { id, values } = input;
      if (id) {
        const { data, error } = await (supabase.from(table) as any).update(values).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await (supabase.from(table) as any).insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export function useDeleteRow(table: Table, invalidateKeys: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export function useEnrollStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, classId }: { studentId: string; classId: string }) => {
      const { data, error } = await supabase.from('enrollments').insert({ student_id: studentId, class_id: classId, status: 'active' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['class-enrollments', v.classId] });
      qc.invalidateQueries({ queryKey: ['student-classes'] });
    },
  });
}

export function useUnenrollStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ enrollmentId }: { enrollmentId: string; classId?: string }) => {
      const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      if (v.classId) qc.invalidateQueries({ queryKey: ['class-enrollments', v.classId] });
      qc.invalidateQueries({ queryKey: ['student-classes'] });
    },
  });
}
