import { Download, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IOSAttachmentCardProps {
  name: string;
  size?: string;
  onDownload?: () => void;
  disabled?: boolean;
  className?: string;
}

export function IOSAttachmentCard({ name, size, onDownload, disabled, className }: IOSAttachmentCardProps) {
  return (
    <div className={cn('flex items-center gap-3 bg-ios-card rounded-ios shadow-ios-card p-3', className)}>
      <div className="h-10 w-10 rounded-[10px] bg-ios-red/12 text-ios-red flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-ios-text truncate">{name}</p>
        {size && <p className="text-[11px] text-ios-gray">{size}</p>}
      </div>
      <button
        type="button"
        onClick={onDownload}
        disabled={disabled}
        aria-label="Baixar"
        className="h-9 w-9 rounded-full bg-muted/60 hover:bg-muted text-ios-text flex items-center justify-center active:scale-95 transition disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
}
