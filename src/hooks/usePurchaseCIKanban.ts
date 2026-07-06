import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCIList, useOrgBuyers } from '@/hooks/useCI';
import { useCostCenters } from '@/hooks/useCostCenters';
import {
  matchesPurchaseCIFilters,
  type PurchaseCIFilters,
  type PurchaseCIKanbanCard,
} from '@/lib/purchaseCIKanban';

export function usePurchaseCIKanban(filters: PurchaseCIFilters) {
  const { organization, isSuperAdmin } = useAuth();
  const ciQuery = useCIList();
  const buyersQuery = useOrgBuyers();
  const costCentersQuery = useCostCenters();

  const purchaseRequestIds = useMemo(
    () => (ciQuery.data ?? []).map((ci) => ci.purchase_request_id).filter((id): id is string => !!id),
    [ciQuery.data],
  );

  const purchaseRequestsQuery = useQuery({
    queryKey: ['purchase_ci_kanban_requests', organization?.organization_id, purchaseRequestIds],
    enabled: (isSuperAdmin || !!organization) && purchaseRequestIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('id, status, responsavel_id, cost_center_id')
        .in('id', purchaseRequestIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const cards = useMemo(() => {
    const buyerMap = new Map(
      (buyersQuery.data ?? []).map((buyer) => [buyer.user_id, buyer.full_name || buyer.email || 'Comprador']),
    );
    const costCenterMap = new Map(
      (costCentersQuery.data ?? []).map((costCenter) => [costCenter.id, costCenter.nome]),
    );
    const purchaseMap = new Map(
      (purchaseRequestsQuery.data ?? []).map((request) => [request.id, request]),
    );

    return (ciQuery.data ?? [])
      .filter((ci) => {
        const destination = ci.destination_sector?.toLocaleLowerCase('pt-BR') ?? '';
        return destination.includes('compras') || !!ci.purchase_request_id;
      })
      .map((ci): PurchaseCIKanbanCard => {
        const purchase = ci.purchase_request_id ? purchaseMap.get(ci.purchase_request_id) : undefined;
        const costCenterId = ci.cost_center_id ?? purchase?.cost_center_id ?? null;
        return {
          ...ci,
          assigned_to: ci.assigned_to ?? purchase?.responsavel_id ?? null,
          buyer_name: ci.assigned_to ? buyerMap.get(ci.assigned_to) ?? null : null,
          cost_center_id: costCenterId,
          cost_center_name: costCenterId ? costCenterMap.get(costCenterId) ?? ci.cost_center ?? null : ci.cost_center ?? null,
          purchase_status: purchase?.status ?? null,
        };
      })
      .filter((card) => matchesPurchaseCIFilters(card, filters));
  }, [buyersQuery.data, ciQuery.data, costCentersQuery.data, filters, purchaseRequestsQuery.data]);

  return {
    cards,
    buyers: buyersQuery.data ?? [],
    costCenters: costCentersQuery.data ?? [],
    campuses: Array.from(new Set((ciQuery.data ?? []).map((ci) => ci.campus).filter((value): value is string => !!value))).sort(),
    requestTypes: Array.from(new Set((ciQuery.data ?? []).map((ci) => ci.request_type).filter((value): value is string => !!value))).sort(),
    isLoading: ciQuery.isLoading || buyersQuery.isLoading || costCentersQuery.isLoading || purchaseRequestsQuery.isLoading,
    error: ciQuery.error || buyersQuery.error || costCentersQuery.error || purchaseRequestsQuery.error,
  };
}
