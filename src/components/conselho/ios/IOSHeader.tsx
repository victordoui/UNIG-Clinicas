import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IOSHeaderProps {
  title: string;
  badgeCount?: number;
  onBellClick?: () => void;
  rightSlot?: React.ReactNode;
  className?: string;
}

export function IOSHeader({ title, badgeCount = 0, onBellClick, rightSlot, className }: IOSHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-3 pt-2 pb-1', className)}>
      <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-ios-text leading-tight">
        {title}
      </h1>
      <div className="flex items-center gap-2 shrink-0">
        {rightSlot}
        {onBellClick !== undefined && (
          <button
            type="button"
            onClick={onBellClick}
            aria-label="Notificações"
            className="relative h-10 w-10 rounded-full flex items-center justify-center bg-ios-card border border-border/40 shadow-sm active:scale-95 transition-transform"
          >
            <Bell className="h-[18px] w-[18px] text-ios-text" strokeWidth={2} />
            {badgeCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-ios-red text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-ios-bg">
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
