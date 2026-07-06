import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type CouncilStatus = 'rascunho' | 'em_votacao' | 'aprovada' | 'reprovada' | 'retirada';
export type CouncilVoteValue = 'aprovado' | 'rejeitado' | 'abstencao';

export interface CouncilProposal {
  id: string;
  organization_id: string;
  ci_id: string | null;
  purchase_request_id: string | null;
  titulo: string;
  justificativa: string | null;
  imagem_url: string | null;
  location: string | null;
  status: CouncilStatus;
  min_votos_aprovacao: number;
  total_membros: number;
  created_by: string;
  decidido_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface CouncilQuote {
  id: string;
  proposal_id: string;
  posicao: number;
  fornecedor: string;
  valor_unit: number;
  qtd: number;
  frete: number;
  total: number;
  condicoes: string | null;
}

export interface CouncilVote {
  id: string;
  proposal_id: string;
  membro_user_id: string;
  voto: CouncilVoteValue;
  comentario: string | null;
  votado_em: string;
}

export interface CouncilMember {
  id: string;
  user_id: string;
  organization_id: string;
  ativo: boolean;
  nome_exibicao: string | null;
  foto_url: string | null;
}

export function useCouncilProposals(status?: CouncilStatus | 'all') {
  const { organization, isSuperAdmin } = useAuth();
  return useQuery({
    queryKey: ['council_proposals', organization?.organization_id, status],
    enabled: !!organization || isSuperAdmin,
    queryFn: async () => {
      let q = supabase.from('council_proposals' as any).select('*').order('created_at', { ascending: false });
      if (status && status !== 'all') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as CouncilProposal[];
    },
  });
}

export function useCouncilProposal(id: string | undefined) {
  return useQuery({
    queryKey: ['council_proposal', id],
    enabled: !!id,
    queryFn: async () => {
      const [{ data: p, error: e1 }, { data: quotes, error: e2 }, { data: votes, error: e3 }] = await Promise.all([
        supabase.from('council_proposals' as any).select('*').eq('id', id!).single(),
        supabase.from('council_proposal_quotes' as any).select('*').eq('proposal_id', id!).order('posicao'),
        supabase.from('council_votes' as any).select('*').eq('proposal_id', id!),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;
      return {
        proposal: p as unknown as CouncilProposal,
        quotes: (quotes ?? []) as unknown as CouncilQuote[],
        votes: (votes ?? []) as unknown as CouncilVote[],
      };
    },
  });
}

export function useCouncilVotesForProposals(proposalIds: string[]) {
  const key = proposalIds.slice().sort().join(',');
  return useQuery({
    queryKey: ['council_votes_bulk', key],
    enabled: proposalIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('council_votes' as any)
        .select('proposal_id, membro_user_id, voto')
        .in('proposal_id', proposalIds);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ proposal_id: string; membro_user_id: string; voto: CouncilVoteValue }>;
    },
  });
}

export function useCouncilMembers() {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ['council_members', organization?.organization_id],
    enabled: !!organization,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('council_members' as any)
        .select('*')
        .eq('organization_id', organization!.organization_id)
        .eq('ativo', true);
      if (error) throw error;
      return (data ?? []) as unknown as CouncilMember[];
    },
  });
}

export function useIsCouncilMember() {
  const { user } = useAuth();
  const { data: members } = useCouncilMembers();
  return !!user && (members ?? []).some(m => m.user_id === user.id);
}

export function useCreateCouncilProposal() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user, organization } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      titulo: string;
      justificativa?: string;
      imagem_url?: string;
      location?: string;
      ci_id?: string | null;
      purchase_request_id?: string | null;
      quotes: Array<{ fornecedor: string; valor_unit: number; qtd: number; frete: number; condicoes?: string }>;
    }) => {
      if (!organization || !user) throw new Error('Sem organização');
      const { data: p, error } = await supabase.from('council_proposals' as any).insert({
        organization_id: organization.organization_id,
        created_by: user.id,
        titulo: input.titulo,
        justificativa: input.justificativa ?? null,
        imagem_url: input.imagem_url ?? null,
        location: input.location ?? null,
        ci_id: input.ci_id ?? null,
        purchase_request_id: input.purchase_request_id ?? null,
      } as any).select().single();
      if (error) throw error;
      const proposal = p as any;
      if (input.quotes.length > 0) {
        const rows = input.quotes.map((q, i) => ({
          proposal_id: proposal.id,
          posicao: i + 1,
          fornecedor: q.fornecedor,
          valor_unit: q.valor_unit,
          qtd: q.qtd,
          frete: q.frete,
          condicoes: q.condicoes ?? null,
        }));
        const { error: e2 } = await supabase.from('council_proposal_quotes' as any).insert(rows as any);
        if (e2) throw e2;
      }
      return proposal.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['council_proposals'] });
      toast({ title: 'Proposta criada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useOpenCouncilVoting() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('council_open_voting' as any, { _proposal_id: id });
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['council_proposal', id] });
      qc.invalidateQueries({ queryKey: ['council_proposals'] });
      toast({ title: 'Aberto para votação' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useCastCouncilVote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (vars: { proposalId: string; voto: CouncilVoteValue; comentario?: string }) => {
      const { error } = await supabase.rpc('council_cast_vote' as any, {
        _proposal_id: vars.proposalId, _voto: vars.voto, _comentario: vars.comentario ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['council_proposal', v.proposalId] });
      qc.invalidateQueries({ queryKey: ['council_proposals'] });
      toast({ title: 'Voto registrado' });
    },
    onError: (e: any) => toast({ title: 'Erro ao votar', description: e.message, variant: 'destructive' }),
  });
}

export function useGrantCouncilTestAccess() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('council_grant_test_access' as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['council_members'] });
      toast({ title: 'Acesso de conselheiro concedido', description: 'Você já pode votar nas propostas.' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

