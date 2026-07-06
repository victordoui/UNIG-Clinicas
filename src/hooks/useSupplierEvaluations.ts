import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface SupplierEvaluation {
  id: string;
  organization_id: string;
  supplier_id: string;
  order_id: string;
  pontualidade: number;
  qualidade: number;
  atendimento: number;
  preco: number;
  nota_geral: number;
  comentario: string | null;
  avaliado_por: string;
  created_at: string;
  updated_at: string;
}

export function useEvaluationByOrder(orderId?: string) {
  return useQuery({
    queryKey: ['supplier_evaluation', 'order', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('supplier_evaluations').select('*')
        .eq('order_id', orderId).maybeSingle();
      if (error) throw error;
      return data as SupplierEvaluation | null;
    },
  });
}

export function useEvaluationsBySupplier(supplierId?: string) {
  return useQuery({
    queryKey: ['supplier_evaluation', 'supplier', supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('supplier_evaluations').select('*')
        .eq('supplier_id', supplierId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupplierEvaluation[];
    },
  });
}

export function useUpsertEvaluation() {
  const qc = useQueryClient();
  const { user, organization } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      id?: string; supplier_id: string; order_id: string;
      pontualidade: number; qualidade: number; atendimento: number; preco: number;
      comentario?: string | null;
    }) => {
      if (!user || !organization) throw new Error('Sessão inválida');
      if (input.id) {
        const { error } = await (supabase as any).from('supplier_evaluations').update({
          pontualidade: input.pontualidade, qualidade: input.qualidade,
          atendimento: input.atendimento, preco: input.preco,
          comentario: input.comentario ?? null,
        }).eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('supplier_evaluations').insert({
          organization_id: organization.organization_id,
          supplier_id: input.supplier_id,
          order_id: input.order_id,
          pontualidade: input.pontualidade,
          qualidade: input.qualidade,
          atendimento: input.atendimento,
          preco: input.preco,
          comentario: input.comentario ?? null,
          avaliado_por: user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier_evaluation'] });
      qc.invalidateQueries({ queryKey: ['kpi_top_suppliers'] });
      toast({ title: 'Avaliação salva com sucesso' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
