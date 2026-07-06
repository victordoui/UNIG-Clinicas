import { Badge } from '@/components/ui/badge';
import {
  REQ_STATUS_LABEL, REQ_STATUS_CLASS, REQ_PRIORITY_LABEL, REQ_PRIORITY_CLASS,
  RequirementStatus, RequirementPriority, slaInfo,
} from '@/lib/requirements';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RequirementStatusBadge({ status }: { status: string }) {
  const s = (status as RequirementStatus) ?? 'open';
  return <Badge variant="outline" className={REQ_STATUS_CLASS[s] ?? ''}>{REQ_STATUS_LABEL[s] ?? status}</Badge>;
}

export function RequirementPriorityBadge({ priority }: { priority?: string | null }) {
  const p = (priority as RequirementPriority) ?? 'normal';
  return <Badge variant="outline" className={REQ_PRIORITY_CLASS[p] ?? ''}>{REQ_PRIORITY_LABEL[p] ?? p}</Badge>;
}

export function SLAChip({ dueDate, status }: { dueDate?: string | null; status?: string }) {
  const info = slaInfo(dueDate, status);
  const Icon = info.overdue ? AlertTriangle : Clock;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border',
      info.overdue ? 'bg-rose-50 text-rose-700 border-rose-200'
        : info.done ? 'bg-muted text-muted-foreground border-border'
        : 'bg-slate-50 text-slate-700 border-slate-200',
    )}>
      <Icon className="h-3 w-3" />{info.text}
    </span>
  );
}
