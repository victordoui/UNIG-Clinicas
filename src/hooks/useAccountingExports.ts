import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface AccountingExport {
  id: string; organization_id: string;
  periodo_inicio: string; periodo_fim: string;
  tipo: 'movimentacoes' | 'contas_pagas' | 'ajustes' | 'consolidado';
  formato: 'csv' | 'txt';
  status: 'gerando' | 'concluido' | 'erro';
  total_linhas: number;
  arquivo_path: string | null;
  hash_integridade: string | null;
  erro_msg: string | null;
  created_at: string;
  concluido_em: string | null;
}

async function sha256Hex(text: string) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toCsv(rows: Record<string, any>[]) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\n');
}

export function useAccountingExports() {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['accounting_exports', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('accounting_exports').select('*')
        .eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as AccountingExport[];
    },
  });
}

export function useAccountingExportActions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { organization, user } = useAuth();
  const orgId = organization?.organization_id;

  const generate = useMutation({
    mutationFn: async (input: { periodo_inicio: string; periodo_fim: string; tipo: AccountingExport['tipo']; formato: 'csv' | 'txt' }) => {
      if (!orgId || !user) throw new Error('Sem organização');

      const { data: created, error: e1 } = await (supabase as any).from('accounting_exports')
        .insert({ ...input, organization_id: orgId, created_by: user.id, status: 'gerando' })
        .select().single();
      if (e1) throw e1;

      try {
        let rows: any[] = [];
        if (input.tipo === 'movimentacoes' || input.tipo === 'consolidado') {
          const { data } = await (supabase as any).from('movements')
            .select('id, created_at, type, product_id, quantity, unit_price, total_value, document_number, supplier, reason')
            .eq('organization_id', orgId)
            .gte('created_at', input.periodo_inicio)
            .lte('created_at', input.periodo_fim + 'T23:59:59');
          rows = rows.concat((data ?? []).map((r: any) => ({ origem: 'movimentacao', ...r })));
        }
        if (input.tipo === 'contas_pagas' || input.tipo === 'consolidado') {
          const { data } = await (supabase as any).from('accounts_payable')
            .select('id, fornecedor, descricao, valor, data_pagamento, status')
            .eq('organization_id', orgId)
            .eq('status', 'pago')
            .gte('data_pagamento', input.periodo_inicio)
            .lte('data_pagamento', input.periodo_fim);
          rows = rows.concat((data ?? []).map((r: any) => ({ origem: 'conta_paga', ...r })));
        }

        const text = toCsv(rows);
        const hash = await sha256Hex(text);
        const filename = `${orgId}/${created.id}.${input.formato}`;
        const blob = new Blob([text], { type: input.formato === 'csv' ? 'text/csv' : 'text/plain' });
        const { error: upErr } = await (supabase as any).storage
          .from('accounting-exports').upload(filename, blob, { upsert: true, contentType: blob.type });
        if (upErr) throw upErr;

        const { error: e2 } = await (supabase as any).from('accounting_exports').update({
          status: 'concluido', total_linhas: rows.length, arquivo_path: filename,
          hash_integridade: hash, concluido_em: new Date().toISOString(),
        }).eq('id', created.id);
        if (e2) throw e2;
        return created.id;
      } catch (err: any) {
        await (supabase as any).from('accounting_exports')
          .update({ status: 'erro', erro_msg: err.message ?? String(err) })
          .eq('id', created.id);
        throw err;
      }
    },
    onSuccess: () => {
      toast({ title: 'Exportação concluída' });
      qc.invalidateQueries({ queryKey: ['accounting_exports'] });
    },
    onError: (e: any) => toast({ title: 'Erro na exportação', description: e.message, variant: 'destructive' }),
  });

  const download = async (exp: AccountingExport) => {
    if (!exp.arquivo_path) return;
    const { data, error } = await (supabase as any).storage
      .from('accounting-exports').createSignedUrl(exp.arquivo_path, 60);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    window.open(data.signedUrl, '_blank');
  };

  return { generate, download };
}
