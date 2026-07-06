import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMyCostCenters } from '@/hooks/useUserCostCenters';
import { isCCManager, managedCostCenters, isPrivilegedForCC } from '@/lib/ccVisibility';

export interface MySectorRequestsSummary {
  total: number;
  pendentes: number;
  emAprovacao: number;
  aprovadas: number;
  reprovadas: number;
  ccIds: string[];
  visible: boolean;
}

/**
 * Counts purchase_requests for the cost centers the user manages
 * (can_approve_cc) or for the whole organization when the user is privileged.
 */
export function useMySectorRequests() {
  const { user, organization, unigRole } = useAuth();
  const { data: myCCs } = useMyCostCenters();
  const visible = isCCManager(unigRole, myCCs);

  const managedIds = managedCostCenters(myCCs).map(c => c.id);
  const privileged = isPrivilegedForCC(unigRole);

  return useQuery({
    enabled: !!user && !!organization && visible,
    queryKey: ['my_sector_requests', organization?.organization_id, managedIds, privileged],
    queryFn: async (): Promise<MySectorRequestsSummary> => {
      let q = supabase
        .from('purchase_requests')
        .select('status, cost_center_id')
        .eq('organization_id', organization!.organization_id);
      if (!privileged) {
        if (managedIds.length === 0) {
          return { total: 0, pendentes: 0, emAprovacao: 0, aprovadas: 0, reprovadas: 0, ccIds: [], visible };
        }
        q = q.in('cost_center_id', managedIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      const rows = data ?? [];
      const count = (s: string) => rows.filter(r => r.status === s).length;
      return {
        total: rows.length,
        pendentes: count('pendente') + count('rascunho'),
        emAprovacao: count('aguardando_aprovacao'),
        aprovadas: count('aprovada'),
        reprovadas: count('reprovada'),
        ccIds: privileged ? [] : managedIds,
        visible,
      };
    },
  });
}
