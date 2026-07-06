import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ScheduleSlot { day: number; start: string; end: string; }

export function useStudentProfile() {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ['student-profile', user?.id],
    enabled: !!user && !!profile?.email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, course:courses(id,code,name,degree_type,modality,duration_semesters), unit:units(id,code,name,city,state)')
        .eq('email', profile!.email!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useStudentClasses(studentId?: string) {
  return useQuery({
    queryKey: ['student-classes', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id, status, enrolled_at,
          class:classes(
            id, code, name, academic_period, shift, room, schedule, capacity, enrolled_count,
            subject:subjects(id, code, name, workload_hours, semester),
            professor:professors(id, full_name, title, department, email),
            course:courses(id, code, name)
          )
        `)
        .eq('student_id', studentId!)
        .order('enrolled_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStudentRequirements(studentId?: string) {
  return useQuery({
    queryKey: ['student-requirements', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_requirements')
        .select('*, category:requirement_categories(id, code, name, department, sla_days)')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAnnouncements(limit = 5) {
  return useQuery({
    queryKey: ['announcements', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpcomingEvents(limit = 3) {
  return useQuery({
    queryKey: ['events-upcoming', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_events')
        .select('*')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRequirementCategories() {
  return useQuery({
    queryKey: ['requirement-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requirement_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}
