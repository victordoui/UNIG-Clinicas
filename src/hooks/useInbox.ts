import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApprovalRequests } from '@/hooks/useApprovalWorkflow';
import { useCouncilProposals } from '@/hooks/useCouncil';
import { useCIList } from '@/hooks/useCI';
import { useAuth } from '@/hooks/useAuth';

export type InboxKind = 'approval' | 'council' | 'ci';

export interface InboxItem {
  id: string;
  kind: InboxKind;
  title: string;
  subtitle?: string;
  reference?: string;
  amount?: number;
  createdAt: string;
  href: string;
  approvalStepId?: string;
  proposalId?: string;
  delegatedFromUserId?: string;
  delegatedFromName?: string;
}

function useProfileNames(ids: string[]) {
  const sorted = Array.from(new Set(ids.filter(Boolean))).sort();
  return useQuery({
    queryKey: ['profile_names', sorted.join(',')],
    enabled: sorted.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', sorted);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((p: any) => {
        map[p.id] = p.full_name || p.email || p.id.slice(0, 8);
      });
      return map;
    },
  });
}

const CI_OPEN_STATUSES = [
  'recebida','em_analise',
  'aguardando_validacao_tecnica','ajuste_solicitado_engenheira',
  'aguardando_validacao_regulatoria','ajuste_solicitado_regulatorio',
  'aguardando_coordenador','aguardando_aprovacao','aprovada','em_cotacao',
  'aguardando_gerente','aguardando_conselho','revisao_solicitada',
  'pedido_emitido','aguardando_entrega','recebida_estoque',
];

export function useInbox() {
  const { user, isSuperAdmin, unigRole, organization } = useAuth();
  const isAdmin = isSuperAdmin || unigRole === 'administrador' || unigRole === 'gerente_geral';
  const approvals = useApprovalRequests('pending_for_me');
  const allApprovals = useApprovalRequests(isAdmin ? 'all' : 'pending_for_me');
  const council = useCouncilProposals('em_votacao');
  const cis = useCIList({ mine: true });
  const allCis = useCIList();

  const myAssignedCIs = useQuery({
    enabled: !!user?.id && !!organization?.organization_id,
    queryKey: ['inbox_my_assigned_cis', organization?.organization_id, user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ci_requests')
        .select('id')
        .eq('organization_id', organization!.organization_id)
        .or(`assigned_to.eq.${user!.id},assigned_to_secondary.eq.${user!.id}`)
        .in('status', CI_OPEN_STATUSES);
      if (error) throw error;
      return (data ?? []).length as number;
    },
  });

  const delegatedOriginIds = useMemo(
    () =>
      (approvals.data ?? [])
        .map((r: any) => r._delegatedFrom)
        .filter((x: string | undefined): x is string => !!x),
    [approvals.data],
  );
  const names = useProfileNames(delegatedOriginIds);

  const items = useMemo<InboxItem[]>(() => {
    const arr: InboxItem[] = [];

    (approvals.data ?? []).forEach((req: any) => {
      const delegatedFrom: string | undefined = req._delegatedFrom;
      const myStep = (req.approval_request_steps || []).find((s: any) => {
        if (s.status !== 'pendente') return false;
        if (delegatedFrom) return s.aprovador_user_id === delegatedFrom;
        return s.aprovador_user_id === user?.id;
      });
      arr.push({
        id: `approval-${req.id}`,
        kind: 'approval',
        title: req.referencia_tipo === 'purchase_order'
          ? 'Pedido aguardando aprovação'
          : 'Solicitação aguardando aprovação',
        subtitle: myStep?.nome ? `Etapa: ${myStep.nome}` : 'Aguarda sua decisão',
        amount: req.valor != null ? Number(req.valor) : undefined,
        createdAt: req.iniciado_em,
        href: `/aprovacoes/${req.id}`,
        approvalStepId: myStep?.id,
        delegatedFromUserId: delegatedFrom,
        delegatedFromName: delegatedFrom ? names.data?.[delegatedFrom] : undefined,
      });
    });

    (council.data ?? []).forEach((p: any) => {
      arr.push({
        id: `council-${p.id}`,
        kind: 'council',
        title: p.titulo,
        subtitle: 'Proposta em votação',
        createdAt: p.created_at,
        href: `/conselho/${p.id}`,
        proposalId: p.id,
      });
    });

    (cis.data ?? [])
      .filter((c: any) => ['recebida', 'em_analise', 'aguardando_aprovacao'].includes(c.status))
      .forEach((c: any) => {
        arr.push({
          id: `ci-${c.id}`,
          kind: 'ci',
          title: c.subject,
          subtitle: `${c.requester_name ?? ''}`,
          reference: c.protocol,
          createdAt: c.created_at,
          href: `/dashboard/ci/${c.id}`,
        });
      });

    return arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [approvals.data, council.data, cis.data, user?.id, names.data]);

  const ciApprovalCount = (allCis.data ?? []).filter(
    (c: any) => ['recebida', 'em_analise', 'aguardando_aprovacao'].includes(c.status),
  ).length;

  const approvalAllPending = isAdmin
    ? (allApprovals.data ?? []).filter((r: any) => r.status === 'pendente').length
    : 0;

  return {
    items,
    counts: {
      all: items.length,
      approval: items.filter((i) => i.kind === 'approval').length,
      council: items.filter((i) => i.kind === 'council').length,
      ci: items.filter((i) => i.kind === 'ci').length,
      ciApproval: ciApprovalCount,
      approvalAll: approvalAllPending,
      myAssignedCIs: myAssignedCIs.data ?? 0,
    },
    isLoading: approvals.isLoading || council.isLoading || cis.isLoading || allCis.isLoading,
  };
}
