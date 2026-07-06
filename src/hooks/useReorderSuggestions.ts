import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface ReorderSuggestion {
  id: string;
  organization_id: string;
  product_id: string;
  quantidade_sugerida: number;
  motivo: string | null;
  status: 'pendente' | 'aceita' | 'rejeitada' | 'convertida';
  request_id: string | null;
  decidido_por: string | null;
  decidido_em: string | null;
  created_at: string;
  product?: { name: string; sku: string; current_stock: number; min_stock: number; category: string };
}

export function useReorderSuggestions(status?: string) {
  return useQuery({
    queryKey: ['reorder_suggestions', status],
    queryFn: async () => {
      let q = (supabase as any)
        .from('reorder_suggestions')
        .select('*, product:products(name, sku, current_stock, min_stock, category)')
        .order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ReorderSuggestion[];
    },
  });
}

export function useGenerateSuggestions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const orgId = organization?.organization_id;
      if (!orgId) throw new Error('Sem organização');
      const { data, error } = await (supabase as any).rpc('generate_reorder_suggestions', { _org: orgId });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['reorder_suggestions'] });
      toast({ title: `${count} nova(s) sugestão(ões) geradas` });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDecideSuggestion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user, organization } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; decision: 'aceita' | 'rejeitada'; quantidade?: number; product_id?: string; product_name?: string }) => {
      if (input.decision === 'aceita') {
        if (!user || !organization?.organization_id) throw new Error('Sessão inválida');
        // create purchase request
        const { data: req, error: reqErr } = await (supabase as any)
          .from('purchase_requests')
          .insert({
            organization_id: organization.organization_id,
            solicitante_id: user.id,
            item_descricao: input.product_name ?? 'Reposição automática',
            quantidade: input.quantidade ?? 1,
            justificativa: 'Sugestão automática de reposição',
            categoria: 'reposicao',
            prioridade: 'normal',
            numero: '',
          })
          .select('id')
          .single();
        if (reqErr) throw reqErr;
        const { error: updErr } = await (supabase as any)
          .from('reorder_suggestions')
          .update({
            status: 'convertida',
            request_id: req.id,
            decidido_por: user.id,
            decidido_em: new Date().toISOString(),
          })
          .eq('id', input.id);
        if (updErr) throw updErr;
        return req.id;
      } else {
        const { error } = await (supabase as any)
          .from('reorder_suggestions')
          .update({ status: 'rejeitada', decidido_por: user?.id, decidido_em: new Date().toISOString() })
          .eq('id', input.id);
        if (error) throw error;
        return null;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['reorder_suggestions'] });
      qc.invalidateQueries({ queryKey: ['purchase_requests'] });
      toast({ title: vars.decision === 'aceita' ? 'Solicitação criada' : 'Sugestão rejeitada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
