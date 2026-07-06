import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Supplier {
  id: string;
  organization_id: string;
  nome_fantasia: string;
  razao_social: string | null;
  cnpj: string | null;
  categoria: string | null;
  contato_nome: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  produtos_servicos: string[] | null;
  avaliacao: number | null;
  ativo: boolean;
  observacoes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useSuppliers() {
  const { organization, isSuperAdmin } = useAuth();
  return useQuery({
    queryKey: ['suppliers', organization?.organization_id],
    enabled: !!organization || isSuperAdmin,
    queryFn: async () => {
      let q = supabase.from('suppliers').select('*').order('created_at', { ascending: false });
      if (!isSuperAdmin && organization) q = q.eq('organization_id', organization.organization_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Supplier[];
    },
  });
}

export function useUpsertSupplier() {
  const qc = useQueryClient();
  const { user, organization } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: Partial<Supplier> & { id?: string }) => {
      if (!user || !organization) throw new Error('Sem organização');
      const payload: any = {
        ...input,
        organization_id: organization.organization_id,
        created_by: input.id ? input.created_by ?? user.id : user.id,
      };
      if (input.id) {
        const { data, error } = await supabase.from('suppliers').update(payload).eq('id', input.id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from('suppliers').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: vars.id ? 'Fornecedor atualizado' : 'Fornecedor criado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('suppliers').delete().eq('id', id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Sem permissão para excluir este fornecedor.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Fornecedor excluído' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
