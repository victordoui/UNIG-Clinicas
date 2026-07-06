import { Clock, ShieldCheck, XCircle, FileEdit, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

type Status = 'rascunho' | 'em_votacao' | 'aprovada' | 'reprovada' | 'retirada';

const CONFIG: Record<Status, { label: string; icon: any; classes: string; dot?: string }> = {
  em_votacao: {
    label: 'Em votação',
    icon: Clock,
    classes: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  aprovada: {
    label: 'Aprovada',
    icon: ShieldCheck,
    classes: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  },
  reprovada: {
    label: 'Reprovada',
    icon: XCircle,
    classes: 'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400',
  },
  rascunho: {
    label: 'Rascunho',
    icon: FileEdit,
    classes: 'bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300',
  },
  retirada: {
    label: 'Retirada',
    icon: Archive,
    classes: 'bg-muted text-muted-foreground border',
  },
};

interface Props {
  status: Status;
  size?: 'sm' | 'md';
  className?: string;
}

export function CouncilStatusChip({ status, size = 'sm', className }: Props) {
  const cfg = CONFIG[status] ?? CONFIG.rascunho;
  const Icon = cfg.icon;
  const sizes = size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[10px] sm:text-xs px-2 py-0.5';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium backdrop-blur-md shadow-sm',
        cfg.classes,
        sizes,
        className,
      )}
    >
      {cfg.dot && (
        <span className="relative flex h-1.5 w-1.5">
          <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', cfg.dot)} />
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', cfg.dot)} />
        </span>
      )}
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}
