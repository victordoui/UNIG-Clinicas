import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SITUATION_BADGE, SITUATION_LABEL, Situation } from '@/lib/grades';

export function SituationBadge({ situation }: { situation: Situation }) {
  return (
    <Badge variant="outline" className={cn('font-medium', SITUATION_BADGE[situation])}>
      {SITUATION_LABEL[situation]}
    </Badge>
  );
}
