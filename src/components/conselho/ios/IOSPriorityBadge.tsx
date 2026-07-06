import { cn } from '@/lib/utils';
import { type IOSPriority, PRIORITY_LABEL, PRIORITY_SHORT } from './iosPriority';

interface IOSPriorityBadgeProps {
  priority: IOSPriority;
  short?: boolean;
  className?: string;
}

const STYLES: Record<IOSPriority, string> = {
  alta: 'bg-ios-red/12 text-ios-red',
  media: 'bg-ios-orange/15 text-ios-orange',
  baixa: 'bg-ios-green/12 text-ios-green',
  neutra: 'bg-muted text-ios-gray',
};

export function IOSPriorityBadge({ priority, short = false, className }: IOSPriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold',
        STYLES[priority],
        className
      )}
    >
      {short ? PRIORITY_SHORT[priority] : PRIORITY_LABEL[priority]}
    </span>
  );
}
