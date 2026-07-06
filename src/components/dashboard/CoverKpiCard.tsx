import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { KpiAccent, KpiSlot, KpiToneId, getTone, KPI_MULTI_DEFAULT } from '@/lib/coverPresets';

export type CoverKpiTone = KpiSlot;

interface CoverKpiCardProps {
  label: string;
  subtitle: string;
  value: React.ReactNode;
  icon: any;
  accent?: KpiAccent;
  tone: KpiSlot;
  customTone?: KpiToneId;
  to?: string;
}

/**
 * Cartão de KPI usado na capa (CoverBanner) do Portal do Solicitante e
 * agora também nos demais dashboards por papel. Visual idêntico ao original
 * de `CIPublicHome.tsx` — extraído para reuso.
 */
export function CoverKpiCard({
  label, subtitle, value, icon: Icon, accent = 'glass', tone, customTone, to,
}: CoverKpiCardProps) {
  const semanticIconColor = {
    blue: 'text-sky-300',
    emerald: 'text-emerald-300',
    orange: 'text-amber-300',
    violet: 'text-violet-300',
  } as const;
  const whiteIconColor = {
    blue: 'text-sky-600',
    emerald: 'text-emerald-600',
    orange: 'text-amber-600',
    violet: 'text-violet-600',
  } as const;
  const toneIconColor: Record<KpiToneId, string> = {
    blue: 'text-blue-100',
    emerald: 'text-emerald-100',
    orange: 'text-orange-100',
    violet: 'text-violet-100',
    sky: 'text-sky-100',
    rose: 'text-rose-100',
    amber: 'text-amber-100',
    slate: 'text-slate-100',
  };

  const isWhite = accent === 'white';
  const isCustom = accent === 'custom';
  const isMulti = accent === 'multi';

  const toneId: KpiToneId | undefined = isMulti
    ? KPI_MULTI_DEFAULT[tone]
    : isCustom
    ? (customTone ?? KPI_MULTI_DEFAULT[tone])
    : undefined;
  const tonePreset = toneId ? getTone(toneId) : null;

  const cardClass = cn(
    'rounded-xl px-2 py-1.5 sm:px-3 sm:py-2 border transition-all flex flex-col items-center text-center gap-0.5 min-w-0',
    to ? 'cursor-pointer hover:scale-[1.03] active:scale-95' : 'cursor-default',
    !isWhite && !tonePreset && 'bg-white/10 backdrop-blur-md border-white/20 shadow-md shadow-black/10 hover:bg-white/15',
    isWhite && 'bg-white border-white/60 shadow-sm shadow-blue-900/10 hover:shadow-md',
    tonePreset && tonePreset.cardCls,
  );

  const labelClass = isWhite ? 'text-slate-700' : 'text-white drop-shadow-sm';
  const valueClass = isWhite ? 'text-slate-900' : 'text-white';

  const iconColor = isWhite
    ? whiteIconColor[tone]
    : toneId
    ? toneIconColor[toneId]
    : semanticIconColor[tone];

  const inner = (
    <div className={cardClass} aria-label={`${label}: ${value}`}>
      <div className="flex flex-row items-center justify-center gap-1 sm:gap-1.5 min-w-0 w-full">
        <Icon className={cn('h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0', iconColor)} strokeWidth={2.25} />
        <span className={cn('text-[9px] sm:text-[11px] font-bold uppercase tracking-wide leading-tight truncate', labelClass)}>
          {label}
        </span>
      </div>
      <span className={cn('text-base sm:text-xl font-bold tabular-nums leading-tight', valueClass)}>
        {value}
      </span>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {to ? <Link to={to} className="block">{inner}</Link> : inner}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {subtitle}
      </TooltipContent>
    </Tooltip>
  );
}
