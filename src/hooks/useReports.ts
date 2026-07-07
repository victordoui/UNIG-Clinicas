import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getPeriodRange, type Filters } from '@/lib/reports';

function range(f: Filters) { return getPeriodRange(f.preset, f.from, f.to); }

// ---------------- Reference lists ----------------
export function useCoursesList() {
  return useQuery({
    queryKey: ['ref-courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('id, name, unit_id').order('name').limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useClassesList(courseId?: string) {
  return useQuery({
    queryKey: ['ref-classes', courseId],
    queryFn: async () => {
      let q = supabase.from('classes').select('id, name, code, course_id, unit_id').order('name').limit(1000);
      if (courseId) q = q.eq('course_id', courseId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUnitsList() {
  return useQuery({
    queryKey: ['ref-units'],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('id, name, city').order('name').limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRequirementCategoriesList() {
  return useQuery({
    queryKey: ['ref-req-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('requirement_categories').select('id, name, department, sla_days').order('name').limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------- Academic reports ----------------
export function useAcademicReport(filters: Filters) {
  return useQuery({
    queryKey: ['report-academic', filters],
    queryFn: async () => {
      const { from, to } = range(filters);

      // Enrollments with class/course/unit
      let eq = supabase
        .from('enrollments')
        .select('id, status, enrolled_at, class:classes(id, name, code, course_id, unit_id, course:courses(id, name), unit:units(id, name))')
        .gte('enrolled_at', from).lte('enrolled_at', to)
        .limit(1000);
      const { data: enrollments, error: e1 } = await eq;
      if (e1) throw e1;

      let filtered = (enrollments ?? []).filter((e: any) => {
        if (filters.courseId && e.class?.course_id !== filters.courseId) return false;
        if (filters.classId && e.class?.id !== filters.classId) return false;
        if (filters.unitId && e.class?.unit_id !== filters.unitId) return false;
        return true;
      });

      const enrollmentIds = filtered.map((e: any) => e.id);

      // Grades
      let grades: any[] = [];
      if (enrollmentIds.length) {
        const { data, error } = await supabase
          .from('grades')
          .select('id, enrollment_id, score, max_score, released_at')
          .in('enrollment_id', enrollmentIds)
          .limit(1000);
        if (error) throw error;
        grades = data ?? [];
      }

      // Attendance
      let attendance: any[] = [];
      if (enrollmentIds.length) {
        const { data, error } = await supabase
          .from('attendance_records')
          .select('id, enrollment_id, status, class_date')
          .in('enrollment_id', enrollmentIds)
          .limit(1000);
        if (error) throw error;
        attendance = data ?? [];
      }

      return { enrollments: filtered, grades, attendance };
    },
  });
}

// ---------------- Operational reports ----------------
export function useOperationalReport(filters: Filters) {
  return useQuery({
    queryKey: ['report-operational', filters],
    queryFn: async () => {
      const { from, to } = range(filters);
      let q = supabase
        .from('student_requirements')
        .select('id, protocol_number, title, status, priority, category_id, assigned_to, due_date, completed_at, created_at, updated_at, student:students(id, unit_id, course_id, class_id), category:requirement_categories(id, name, department, sla_days)')
        .gte('created_at', from).lte('created_at', to)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.categoryId) q = q.eq('category_id', filters.categoryId);
      const { data, error } = await q;
      if (error) throw error;
      let rows = data ?? [];
      if (filters.unitId) rows = rows.filter((r: any) => r.student?.unit_id === filters.unitId);
      return rows;
    },
  });
}
