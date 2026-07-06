import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IOSImpactRowProps {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: 'green' | 'orange' | 'red' | 'blue';
  className?: string;
}

const TONE: Record<IOSImpactRowProps['tone'], string> = {
  green: 'bg-ios-green/15 text-ios-green',
  orange: 'bg-ios-orange/15 text-ios-orange',
  red: 'bg-ios-red/12 text-ios-red',
  blue: 'bg-ios-blue/12 text-ios-blue',
};

export function IOSImpactRow({ icon: Icon, title, description, tone, className }: IOSImpactRowProps) {
  return (
    <div className={cn('flex items-start gap-3 py-2', className)}>
      <div className={cn('h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0', TONE[tone])}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-ios-text leading-tight">{title}</p>
        <p className="text-[12px] text-ios-gray leading-snug mt-0.5">{description}</p>
      </div>
    </div>
  );
}
