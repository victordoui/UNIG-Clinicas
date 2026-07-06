import { Badge } from '@/components/ui/badge';
import { CI_STATUS_BADGE, CI_STATUS_LABEL, type CIStatus } from '@/lib/ciLabels';
import { cn } from '@/lib/utils';

export function CIStatusBadge({ status, className }: { status: CIStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn('border', CI_STATUS_BADGE[status], className)}>
      {CI_STATUS_LABEL[status]}
    </Badge>
  );
}
