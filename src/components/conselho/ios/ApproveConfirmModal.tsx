import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Check, X } from 'lucide-react';
import { SwipeToApprove } from './SwipeToApprove';

interface ApproveConfirmModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  valueLabel: string;
  onApprove: () => Promise<void>;
  onCancel?: () => void;
}

export function ApproveConfirmModal({
  open, onOpenChange, title, valueLabel, onApprove, onCancel,
}: ApproveConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-ios-lg bg-ios-card border-0">
        <button
          type="button"
          onClick={() => { onCancel?.(); onOpenChange(false); }}
          className="absolute left-4 top-4 text-ios-blue text-[15px] font-medium z-10"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center"
          aria-label="Fechar"
        >
          <X className="h-4 w-4 text-ios-gray" />
        </button>

        <div className="pt-16 pb-8 px-6 flex flex-col items-center gap-5">
          <div className="h-20 w-20 rounded-full bg-ios-green flex items-center justify-center shadow-lg shadow-ios-green/30 animate-scale-in">
            <Check className="h-10 w-10 text-white" strokeWidth={3} />
          </div>

          <div className="text-center space-y-1">
            <DialogTitle asChild>
              <h2 className="text-[20px] font-bold text-ios-text">Aprovar compra</h2>
            </DialogTitle>
            <p className="text-[14px] text-ios-gray">{title}</p>
            <p className="text-[28px] font-bold tabular-nums text-ios-green pt-2">{valueLabel}</p>
          </div>

          <div className="w-full pt-2">
            <SwipeToApprove onComplete={async () => { await onApprove(); setTimeout(() => onOpenChange(false), 1200); }} />
          </div>

          <p className="text-[11px] text-ios-gray text-center inline-flex items-center gap-1">
            🔒 Aprovação registrada com segurança
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
