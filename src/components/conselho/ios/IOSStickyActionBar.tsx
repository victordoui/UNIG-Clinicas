import { Check, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IOSStickyActionBarProps {
  onAdjust?: () => void;
  onApprove?: () => void;
  approveDisabled?: boolean;
  adjustDisabled?: boolean;
  className?: string;
}

export function IOSStickyActionBar({ onAdjust, onApprove, approveDisabled, adjustDisabled, className }: IOSStickyActionBarProps) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-[64px] md:bottom-0 z-[60] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]',
        'bg-ios-card/95 backdrop-blur-xl border-t border-border/40 shadow-ios-bar',
        className
      )}
    >
      <div className="max-w-2xl mx-auto flex gap-2.5">
        <button
          type="button"
          onClick={onAdjust}
          disabled={adjustDisabled}
          className={cn(
            'flex-1 h-12 rounded-full inline-flex items-center justify-center gap-2',
            'bg-ios-card border-2 border-ios-blue text-ios-blue font-semibold text-[15px]',
            'active:scale-[0.98] transition disabled:opacity-50'
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Solicitar ajuste
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={approveDisabled}
          className={cn(
            'flex-1 h-12 rounded-full inline-flex items-center justify-center gap-2',
            'bg-ios-blue text-white font-semibold text-[15px] shadow-md',
            'active:scale-[0.98] transition disabled:opacity-50'
          )}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
          Aprovar
        </button>
      </div>
    </div>
  );
}
