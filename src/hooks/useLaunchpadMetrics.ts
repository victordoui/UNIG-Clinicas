import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LaunchpadMetrics = {
  pending_approvals: number;
  my_requests: number;
  my_pending_ci: number;
  open_quotations: number;
  orders_in_progress: number;
  orders_late: number;
  receipts_today: number;
  movements_today: number;
  active_alerts: number;
  active_suppliers: number;
  total_value_pending: number;
  council_pending: number;
  supplier_quotes: number;
  supplier_orders: number;
};

const ZERO: LaunchpadMetrics = {
  pending_approvals: 0, my_requests: 0, my_pending_ci: 0, open_quotations: 0,
  orders_in_progress: 0, orders_late: 0, receipts_today: 0, movements_today: 0,
  active_alerts: 0, active_suppliers: 0, total_value_pending: 0,
  council_pending: 0, supplier_quotes: 0, supplier_orders: 0,
};

export function useLaunchpadMetrics() {
  return useQuery({
    queryKey: ["launchpad-metrics"],
    queryFn: async (): Promise<LaunchpadMetrics> => {
      const { data, error } = await supabase.rpc("get_launchpad_metrics", { _org: null });
      if (error) {
        console.error("[launchpad-metrics]", error);
        return ZERO;
      }
      return { ...ZERO, ...(data as any) };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
