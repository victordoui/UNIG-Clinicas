import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ContractRow {
  id: string;
  organization_id: string;
  supplier_id: string;
  numero: string;
  inicio: string;
  fim: string;
  status: string;
  condicao_pagamento: string | null;
  desconto_percent: number;
  arquivo_url: string | null;
  observacoes: string | null;
  auto_renovacao: boolean;
  dias_aviso_vencimento: number;
  valor_mensal: number | null;
  categoria: string | null;
  aviso_enviado_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractsDashboard {
  ativos: number;
  vencendo_30d: number;
  vencidos: number;
  em_renovacao: number;
  valor_mensal_total: number;
}

export interface ContractFilters {
  status?: string;
  supplierId?: string;
  categoria?: string;
  expiringDays?: number;
}

export function useContractsList(filters: ContractFilters = {}) {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['contracts_list', orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = (supabase as any)
        .from('supplier_contracts')
        .select('*, suppliers:supplier_id(nome_fantasia)')
        .eq('organization_id', orgId)
        .order('fim', { ascending: true });
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.supplierId) q = q.eq('supplier_id', filters.supplierId);
      if (filters.categoria) q = q.eq('categoria', filters.categoria);
      if (filters.expiringDays) {
        const limit = new Date();
        limit.setDate(limit.getDate() + filters.expiringDays);
        q = q.lte('fim', limit.toISOString().slice(0, 10));
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as (ContractRow & { suppliers?: { nome_fantasia: string } })[];
    },
  });
}

export function useContractsDashboard() {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ['contracts_dashboard', organization?.organization_id],
    enabled: !!organization?.organization_id,
    queryFn: async (): Promise<ContractsDashboard> => {
      const { data, error } = await (supabase as any).rpc('get_contracts_dashboard');
      if (error) throw error;
      const row = (data && data[0]) || { ativos: 0, vencendo_30d: 0, vencidos: 0, em_renovacao: 0, valor_mensal_total: 0 };
      return {
        ativos: Number(row.ativos ?? 0),
        vencendo_30d: Number(row.vencendo_30d ?? 0),
        vencidos: Number(row.vencidos ?? 0),
        em_renovacao: Number(row.em_renovacao ?? 0),
        valor_mensal_total: Number(row.valor_mensal_total ?? 0),
      };
    },
  });
}

export function useActiveContractFor(supplierId?: string) {
  const list = useContractsList({ supplierId, status: 'ativo' });
  return {
    ...list,
    data: (list.data ?? []).find((c) => c.fim >= new Date().toISOString().slice(0, 10)),
  };
}

export function useRenewContract() {
  const { organization, user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (args: { contract: ContractRow; months?: number }) => {
      if (!organization || !user) throw new Error('Sem organização');
      const months = args.months ?? 12;
      const newStart = new Date(args.contract.fim);
      newStart.setDate(newStart.getDate() + 1);
      const newEnd = new Date(newStart);
      newEnd.setMonth(newEnd.getMonth() + months);
      const payload: any = {
        organization_id: organization.organization_id,
        supplier_id: args.contract.supplier_id,
        numero: `${args.contract.numero}-R`,
        inicio: newStart.toISOString().slice(0, 10),
        fim: newEnd.toISOString().slice(0, 10),
        condicao_pagamento: args.contract.condicao_pagamento,
        desconto_percent: args.contract.desconto_percent,
        status: 'ativo',
        valor_mensal: args.contract.valor_mensal,
        categoria: args.contract.categoria,
        auto_renovacao: args.contract.auto_renovacao,
        dias_aviso_vencimento: args.contract.dias_aviso_vencimento,
        observacoes: `Renovação de ${args.contract.numero}`,
        created_by: user.id,
      };
      const { error } = await (supabase as any).from('supplier_contracts').insert(payload);
      if (error) throw error;
      // Close previous one
      await (supabase as any)
        .from('supplier_contracts')
        .update({ status: 'encerrado' })
        .eq('id', args.contract.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts_list'] });
      qc.invalidateQueries({ queryKey: ['contracts_dashboard'] });
      qc.invalidateQueries({ queryKey: ['supplier_contracts'] });
      toast({ title: 'Contrato renovado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useEndContract() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any)
        .from('supplier_contracts')
        .update({ status: 'encerrado' })
        .eq('id', id)
        .select();
      if (error) throw error;
      if (!data?.length) throw new Error('Sem permissão');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts_list'] });
      qc.invalidateQueries({ queryKey: ['contracts_dashboard'] });
      qc.invalidateQueries({ queryKey: ['supplier_contracts'] });
      toast({ title: 'Contrato encerrado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useContractOrders(contractId?: string) {
  return useQuery({
    queryKey: ['contract_orders', contractId],
    enabled: !!contractId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('purchase_orders')
        .select('id, numero, valor_total, status, created_at')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function contractStatusBadgeClass(c: { status: string; fim: string }) {
  const today = new Date().toISOString().slice(0, 10);
  if (c.status === 'encerrado') return 'bg-muted text-muted-foreground border-border';
  if (c.fim < today) return 'bg-destructive/15 text-destructive border-destructive/30';
  if (c.status === 'em_renovacao') return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
  if (c.status === 'suspenso') return 'bg-slate-400/15 text-slate-700 border-slate-400/30';
  // ativo
  const days = Math.ceil((new Date(c.fim).getTime() - Date.now()) / 86_400_000);
  if (days <= 30) return 'bg-orange-500/15 text-orange-700 border-orange-500/30';
  return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
}

export function contractStatusLabel(c: { status: string; fim: string }) {
  const today = new Date().toISOString().slice(0, 10);
  if (c.status === 'encerrado') return 'Encerrado';
  if (c.fim < today) return 'Vencido';
  if (c.status === 'em_renovacao') return 'Em renovação';
  if (c.status === 'suspenso') return 'Suspenso';
  return 'Ativo';
}

export function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}
