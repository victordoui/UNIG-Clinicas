import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface SupplierContract {
  id: string;
  organization_id: string;
  supplier_id: string;
  numero: string;
  inicio: string;
  fim: string;
  condicao_pagamento: string | null;
  desconto_percent: number;
  arquivo_url: string | null;
  status: 'ativo' | 'encerrado' | 'suspenso' | 'em_renovacao';
  observacoes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  auto_renovacao?: boolean;
  dias_aviso_vencimento?: number;
  valor_mensal?: number | null;
  categoria?: string | null;
  aviso_enviado_em?: string | null;
}

export interface ContractItem {
  id: string;
  contract_id: string;
  organization_id: string;
  product_id: string | null;
  descricao: string | null;
  preco_unitario: number;
  quantidade_minima: number | null;
  prazo_entrega_dias: number | null;
}

export function useSupplierContracts(supplierId?: string) {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['supplier_contracts', orgId, supplierId],
    enabled: !!orgId,
    queryFn: async () => {
      let q = (supabase as any).from('supplier_contracts').select('*').eq('organization_id', orgId);
      if (supplierId) q = q.eq('supplier_id', supplierId);
      const { data, error } = await q.order('inicio', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupplierContract[];
    },
  });
}

export function useUpsertContract() {
  const { organization, user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (c: Partial<SupplierContract> & { id?: string }) => {
      if (!organization || !user) throw new Error('Sem organização');
      const payload: any = {
        organization_id: organization.organization_id,
        supplier_id: c.supplier_id,
        numero: c.numero,
        inicio: c.inicio,
        fim: c.fim,
        condicao_pagamento: c.condicao_pagamento || null,
        desconto_percent: c.desconto_percent ?? 0,
        arquivo_url: c.arquivo_url || null,
        status: c.status ?? 'ativo',
        observacoes: c.observacoes || null,
        created_by: user.id,
        auto_renovacao: c.auto_renovacao ?? false,
        dias_aviso_vencimento: c.dias_aviso_vencimento ?? 30,
        valor_mensal: c.valor_mensal ?? null,
        categoria: c.categoria ?? null,
      };
      if (c.id) {
        const { error } = await (supabase as any).from('supplier_contracts').update(payload).eq('id', c.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('supplier_contracts').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier_contracts'] });
      toast({ title: 'Contrato salvo' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteContract() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any).from('supplier_contracts').delete().eq('id', id).select();
      if (error) throw error;
      if (!data?.length) throw new Error('Sem permissão');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier_contracts'] });
      toast({ title: 'Contrato removido' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useContractItems(contractId?: string) {
  return useQuery({
    queryKey: ['contract_items', contractId],
    enabled: !!contractId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('contract_items')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as ContractItem[];
    },
  });
}

export function useUpsertContractItem() {
  const { organization } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (i: Partial<ContractItem> & { id?: string }) => {
      if (!organization) throw new Error('Sem organização');
      const payload: any = {
        organization_id: organization.organization_id,
        contract_id: i.contract_id,
        product_id: i.product_id || null,
        descricao: i.descricao || null,
        preco_unitario: i.preco_unitario,
        quantidade_minima: i.quantidade_minima ?? 1,
        prazo_entrega_dias: i.prazo_entrega_dias ?? null,
      };
      if (i.id) {
        const { error } = await (supabase as any).from('contract_items').update(payload).eq('id', i.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('contract_items').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['contract_items', vars.contract_id] });
      toast({ title: 'Item salvo' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteContractItem() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (item: { id: string; contract_id: string }) => {
      const { error } = await (supabase as any).from('contract_items').delete().eq('id', item.id);
      if (error) throw error;
      return item;
    },
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ['contract_items', item.contract_id] });
      toast({ title: 'Item removido' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
