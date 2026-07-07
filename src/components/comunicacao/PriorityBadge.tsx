import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PRIORITY_BADGE, PRIORITY_LABEL, type CommPriority } from '@/lib/communication';

export function PriorityBadge({ priority }: { priority: CommPriority | string }) {
  const p = (priority as CommPriority) in PRIORITY_BADGE ? (priority as CommPriority) : 'normal';
  return <Badge variant="outline" className={cn(PRIORITY_BADGE[p])}>{PRIORITY_LABEL[p]}</Badge>;
}
