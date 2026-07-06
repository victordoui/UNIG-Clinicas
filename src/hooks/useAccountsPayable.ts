import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface AccountPayable {
  id: string;
  organization_id: string;
  order_id: string | null;
  supplier_id: string | null;
  cost_center_id: string | null;
  numero_documento: string | null;
  descricao: string | null;
  categoria: string | null;
  valor_total: number;
  valor_pago: number;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento: string | null;
  status: 'pendente' | 'parcial' | 'pago' | 'cancelado' | 'vencido';
  forma_pagamento: string | null;
  observacoes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  organization_id: string;
  account_payable_id: string;
  bank_account_id: string | null;
  valor: number;
  data_pagamento: string;
  forma_pagamento: string;
  comprovante_url: string | null;
  observacoes: string | null;
  created_by: string;
  created_at: string;
}

export interface PayableFilters {
  status?: string;
  supplier_id?: string;
  cost_center_id?: string;
  vencimento_de?: string;
  vencimento_ate?: string;
}

export function useAccountsPayable(filters: PayableFilters = {}) {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['accounts_payable', orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = (supabase as any)
        .from('accounts_payable')
        .select('*, suppliers(nome_fantasia), cost_centers(nome), purchase_orders(numero)')
        .eq('organization_id', orgId)
        .order('data_vencimento', { ascending: true });
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.supplier_id) q = q.eq('supplier_id', filters.supplier_id);
      if (filters.cost_center_id) q = q.eq('cost_center_id', filters.cost_center_id);
      if (filters.vencimento_de) q = q.gte('data_vencimento', filters.vencimento_de);
      if (filters.vencimento_ate) q = q.lte('data_vencimento', filters.vencimento_ate);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as (AccountPayable & {
        suppliers?: { nome_fantasia: string };
        cost_centers?: { nome: string };
        purchase_orders?: { numero: string };
      })[];
    },
  });
}

export function useAccountPayable(id: string | undefined) {
  return useQuery({
    queryKey: ['account_payable', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('accounts_payable')
        .select('*, suppliers(nome_fantasia), cost_centers(nome), purchase_orders(numero)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function usePaymentTransactions(payableId: string | undefined) {
  return useQuery({
    queryKey: ['payment_transactions', payableId],
    enabled: !!payableId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('payment_transactions')
        .select('*, bank_accounts(nome)')
        .eq('account_payable_id', payableId)
        .order('data_pagamento', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PaymentTransaction[];
    },
  });
}

export function useAccountsPayableSummary() {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['ap_summary', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('accounts_payable_summary');
      if (error) throw error;
      return (data ?? {}) as {
        total_pendente?: number;
        total_vencido?: number;
        vence_7_dias?: number;
        vence_30_dias?: number;
        pago_mes?: number;
        count_vencido?: number;
        count_pendente?: number;
      };
    },
  });
}

export function useCashFlowProjection(dias = 30) {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['cash_flow', orgId, dias],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('cash_flow_projection', { _dias: dias });
      if (error) throw error;
      return (data ?? []) as { dia: string; valor_a_pagar: number; qtd: number }[];
    },
  });
}

export function useRegisterPayment() {
  const { organization, user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      account_payable_id: string;
      valor: number;
      data_pagamento: string;
      forma_pagamento: string;
      bank_account_id?: string | null;
      observacoes?: string | null;
      comprovante_file?: File | null;
    }) => {
      if (!organization || !user) throw new Error('Sem organização');
      let comprovante_url: string | null = null;
      if (input.comprovante_file) {
        const path = `${organization.organization_id}/${input.account_payable_id}/${Date.now()}-${input.comprovante_file.name}`;
        const { error: upErr } = await supabase.storage.from('payment-receipts').upload(path, input.comprovante_file);
        if (upErr) throw upErr;
        comprovante_url = path;
      }
      const { error } = await (supabase as any).from('payment_transactions').insert({
        organization_id: organization.organization_id,
        account_payable_id: input.account_payable_id,
        bank_account_id: input.bank_account_id || null,
        valor: input.valor,
        data_pagamento: input.data_pagamento,
        forma_pagamento: input.forma_pagamento,
        comprovante_url,
        observacoes: input.observacoes || null,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts_payable'] });
      qc.invalidateQueries({ queryKey: ['account_payable'] });
      qc.invalidateQueries({ queryKey: ['payment_transactions'] });
      qc.invalidateQueries({ queryKey: ['ap_summary'] });
      qc.invalidateQueries({ queryKey: ['cash_flow'] });
      toast({ title: 'Pagamento registrado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeletePayable() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any).from('accounts_payable').delete().eq('id', id).select();
      if (error) throw error;
      if (!data?.length) throw new Error('Sem permissão');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts_payable'] });
      qc.invalidateQueries({ queryKey: ['ap_summary'] });
      toast({ title: 'Conta removida' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
