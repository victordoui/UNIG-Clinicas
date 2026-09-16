import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export type TvInsertionRequest = { request_id: string; campaign_id: string; requested_at: string; expires_at: string };
export function useTvInsertion(clinicId: string | null | undefined) {
  return useQuery({
    queryKey: ["tv-insertion", clinicId], enabled: Boolean(clinicId), refetchInterval: 2000, retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("tv_insertion_requests" as any)
        .select("request_id,campaign_id,requested_at,expires_at").eq("clinic_id", clinicId!).maybeSingle();
      if (error) throw error;
      return data as unknown as TvInsertionRequest | null;
    },
  });
}
