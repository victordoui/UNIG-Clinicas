import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export type CoverKpiTone = 'blue' | 'emerald' | 'orange' | 'violet';

interface CoverKpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone: CoverKpiTone;
  to?: string;
}

const iconColor: Record<CoverKpiTone, string> = {
  blue: 'text-sky-200',
  emerald: 'text-emerald-200',
  orange: 'text-amber-200',
  violet: 'text-violet-200',
};

export function CoverKpiCard({ label, value, icon: Icon, tone, to }: CoverKpiCardProps) {
  const inner = (
    <div
      className={cn(
        'rounded-xl px-2 py-2 sm:px-3 border bg-white/10 backdrop-blur-md border-white/20 shadow-md shadow-black/10 flex flex-col items-center text-center gap-0.5 min-w-0 transition-all',
        to && 'cursor-pointer hover:bg-white/15 hover:scale-[1.03] active:scale-95',
      )}
    >
      <div className="flex items-center justify-center gap-1.5 min-w-0 w-full">
        <Icon className={cn('h-3.5 w-3.5 shrink-0', iconColor[tone])} strokeWidth={2.25} />
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide leading-tight truncate text-white/95">
          {label}
        </span>
      </div>
      <span className="text-lg sm:text-xl font-bold tabular-nums leading-tight text-white">{value}</span>
    </div>
  );

  return to ? <Link to={to} className="block">{inner}</Link> : inner;
}
