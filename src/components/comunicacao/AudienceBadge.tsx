import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AUDIENCE_BADGE, AUDIENCE_LABEL, type Audience } from '@/lib/communication';

export function AudienceBadge({ audience }: { audience: Audience | string }) {
  const a = (audience as Audience) in AUDIENCE_BADGE ? (audience as Audience) : 'todos';
  return (
    <Badge variant="outline" className={cn(AUDIENCE_BADGE[a])}>
      {AUDIENCE_LABEL[a]}
    </Badge>
  );
}
