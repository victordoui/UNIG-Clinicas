import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Sparkles, Clock } from 'lucide-react';
import type { PipelineData } from '@/hooks/usePurchasePipeline';
import { CI_PRIORITY_BADGE, CI_PRIORITY_LABEL } from '@/lib/ciLabels';
import { PRIORITY_BADGE, PRIORITY_LABEL } from '@/lib/purchaseLabels';

export function PipelineHeader({ data }: { data: PipelineData }) {
  const protocol = data.ci?.protocol ?? data.request?.numero ?? data.order?.numero ?? '—';
  const title = data.ci?.subject ?? data.request?.item_descricao ?? 'Pedido de compra';
  const createdAt = data.ci?.created_at ?? data.request?.created_at ?? data.order?.created_at;
  const priority = data.ci?.priority ?? data.request?.prioridade ?? null;
  const priorityLabel = data.ci ? CI_PRIORITY_LABEL[data.ci.priority] : data.request ? PRIORITY_LABEL[data.request.prioridade] : null;
  const priorityClass = data.ci ? CI_PRIORITY_BADGE[data.ci.priority] : data.request ? PRIORITY_BADGE[data.request.prioridade] : '';

  return (
    <Card className="rounded-3xl border-0 bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground p-6 sm:p-7 shadow-lg relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/20 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
      <div className="relative space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> Esteira de Compras
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm/none px-2 py-1 rounded bg-white/15">{protocol}</span>
          {priority && priorityLabel && (
            <Badge variant="outline" className={`${priorityClass} border-white/30 bg-white/15 text-white`}>{priorityLabel}</Badge>
          )}
          {data.isRejected && (
            <Badge variant="outline" className="bg-destructive/20 border-destructive/40 text-white">Reprovado</Badge>
          )}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">{title}</h1>
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-md">
            <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
            <span className="text-[11px] uppercase tracking-wider font-semibold opacity-90">Etapa atual</span>
            <span className="text-sm font-bold">{data.currentStep.label}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-white/90">
          {createdAt && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Aberta em {new Date(createdAt).toLocaleString('pt-BR')}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
