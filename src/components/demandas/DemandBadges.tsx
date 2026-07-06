import { Badge } from '@/components/ui/badge';
import { DemandStatus, DEMAND_STATUS_LABEL, DemandPriority, DEMAND_PRIORITY_LABEL } from '@/hooks/useOperationalDemands';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<DemandStatus, string> = {
  rascunho: 'bg-slate-100 text-slate-700 border-slate-200',
  registrada: 'bg-blue-50 text-blue-700 border-blue-200',
  em_analise: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  em_planejamento: 'bg-violet-50 text-violet-700 border-violet-200',
  aguardando_aprovacao: 'bg-amber-50 text-amber-700 border-amber-200',
  aguardando_orcamento: 'bg-amber-50 text-amber-700 border-amber-200',
  aguardando_compra: 'bg-orange-50 text-orange-700 border-orange-200',
  aguardando_equipe: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  aguardando_fornecedor: 'bg-teal-50 text-teal-700 border-teal-200',
  em_execucao: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pausada: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  concluida: 'bg-green-100 text-green-800 border-green-300',
  cancelada: 'bg-rose-50 text-rose-700 border-rose-200',
};

const PRIORITY_STYLE: Record<DemandPriority, string> = {
  baixa: 'bg-slate-100 text-slate-700 border-slate-200',
  media: 'bg-blue-50 text-blue-700 border-blue-200',
  alta: 'bg-orange-50 text-orange-800 border-orange-200',
  urgente: 'bg-rose-100 text-rose-700 border-rose-300',
};

export function DemandStatusBadge({ status, className }: { status: DemandStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn('font-medium', STATUS_STYLE[status], className)}>
      {DEMAND_STATUS_LABEL[status]}
    </Badge>
  );
}

export function DemandPriorityBadge({ priority, className }: { priority: DemandPriority; className?: string }) {
  return (
    <Badge variant="outline" className={cn('font-medium', PRIORITY_STYLE[priority], className)}>
      {DEMAND_PRIORITY_LABEL[priority]}
    </Badge>
  );
}
