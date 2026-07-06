import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface BankAccount {
  id: string;
  organization_id: string;
  nome: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipo: string;
  saldo_inicial: number;
  ativo: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useBankAccounts() {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['bank_accounts', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('bank_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .order('nome');
      if (error) throw error;
      return (data ?? []) as BankAccount[];
    },
  });
}

export function useUpsertBankAccount() {
  const { organization, user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (b: Partial<BankAccount> & { id?: string }) => {
      if (!organization || !user) throw new Error('Sem organização');
      const payload: any = {
        organization_id: organization.organization_id,
        nome: b.nome,
        banco: b.banco || null,
        agencia: b.agencia || null,
        conta: b.conta || null,
        tipo: b.tipo || 'corrente',
        saldo_inicial: b.saldo_inicial ?? 0,
        ativo: b.ativo ?? true,
        created_by: user.id,
      };
      if (b.id) {
        const { error } = await (supabase as any).from('bank_accounts').update(payload).eq('id', b.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('bank_accounts').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast({ title: 'Conta bancária salva' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteBankAccount() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any).from('bank_accounts').delete().eq('id', id).select();
      if (error) throw error;
      if (!data?.length) throw new Error('Sem permissão');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast({ title: 'Conta bancária removida' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
