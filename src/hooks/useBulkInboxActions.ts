import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { InboxItem } from '@/hooks/useInbox';

export type BulkDecision = 'aprovado' | 'rejeitado';

export interface BulkProgress {
  total: number;
  done: number;
  ok: number;
  failed: number;
}

export function useBulkInboxActions() {
  const qc = useQueryClient();
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  async function run(items: InboxItem[], decisao: BulkDecision, comentario?: string) {
    const actionable = items.filter(
      (i) => (i.kind === 'approval' && i.approvalStepId) || (i.kind === 'council' && i.proposalId),
    );
    if (actionable.length === 0) {
      toast.error('Nenhum item selecionado com ação aplicável');
      return;
    }

    setIsRunning(true);
    setProgress({ total: actionable.length, done: 0, ok: 0, failed: 0 });

    let ok = 0;
    let failed = 0;
    const failures: string[] = [];

    for (const item of actionable) {
      try {
        if (item.kind === 'approval') {
          const { error } = await supabase.rpc('decide_approval_step' as any, {
            _step_id: item.approvalStepId!,
            _decisao: decisao,
            _comentario: comentario ?? null,
          });
          if (error) throw error;
        } else if (item.kind === 'council') {
          const { error } = await supabase.rpc('cast_council_vote' as any, {
            _proposal_id: item.proposalId!,
            _voto: decisao,
            _comentario: comentario ?? null,
          });
          if (error) throw error;
        }
        ok++;
      } catch (e: any) {
        failed++;
        failures.push(`${item.title}: ${e.message ?? 'erro'}`);
      }
      setProgress((p) => p && { ...p, done: p.done + 1, ok, failed });
    }

    await Promise.all([
      qc.invalidateQueries({ queryKey: ['approval_requests'] }),
      qc.invalidateQueries({ queryKey: ['council_proposals'] }),
      qc.invalidateQueries({ queryKey: ['my_pending_approvals'] }),
      qc.invalidateQueries({ queryKey: ['launchpad_metrics'] }),
    ]);

    setIsRunning(false);
    setProgress(null);

    if (failed === 0) {
      toast.success(`${ok} ${decisao === 'aprovado' ? 'aprovado(s)' : 'rejeitado(s)'} com sucesso`);
    } else if (ok === 0) {
      toast.error(`Falha em ${failed} item(ns)`, { description: failures.slice(0, 3).join('\n') });
    } else {
      toast.warning(`${ok} concluído(s), ${failed} falhou(aram)`, {
        description: failures.slice(0, 3).join('\n'),
      });
    }

    return { ok, failed };
  }

  return {
    bulkApprove: (items: InboxItem[], comentario?: string) => run(items, 'aprovado', comentario),
    bulkReject: (items: InboxItem[], comentario?: string) => run(items, 'rejeitado', comentario),
    isRunning,
    progress,
  };
}
