import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AcademicEvent = { id: string; title: string; event_type: string; starts_at: string; ends_at: string | null };

export function useAcademicEvents() {
  return useQuery({
    queryKey: ['academic-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_events')
        .select('id, title, event_type, starts_at, ends_at')
        .gte('starts_at', new Date(new Date().getFullYear(), 0, 1).toISOString())
        .order('starts_at')
        .limit(100);
      if (error) throw error;
      return data as AcademicEvent[];
    },
  });
}
