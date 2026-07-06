import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CITemplate {
  id: string;
  name: string;
  payload: any;
  created_at: string;
  created_by: string;
  organization_id: string;
}

export function useCITemplates() {
  const { user, organization } = useAuth();
  const qc = useQueryClient();
  const orgId = organization?.organization_id;

  const list = useQuery({
    queryKey: ['ci-templates', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ci_templates' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CITemplate[];
    },
  });

  const save = useMutation({
    mutationFn: async ({ name, payload }: { name: string; payload: any }) => {
      if (!user?.id || !orgId) throw new Error('Sessão inválida');
      const { error } = await supabase.from('ci_templates' as any).insert({
        name,
        payload,
        created_by: user.id,
        organization_id: orgId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ci-templates', orgId] });
      toast.success('Modelo salvo');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao salvar modelo'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error, data } = await supabase
        .from('ci_templates' as any)
        .delete()
        .eq('id', id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Sem permissão para excluir este modelo');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ci-templates', orgId] });
      toast.success('Modelo excluído');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao excluir'),
  });

  return { list, save, remove };
}
