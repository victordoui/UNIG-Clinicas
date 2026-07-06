import { ChevronRight, Image as ImageIcon, Vote } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { IOSPriorityBadge } from './IOSPriorityBadge';
import type { IOSPriority } from './iosPriority';

interface IOSProposalCardProps {
  imageUrl?: string | null;
  title: string;
  valueLabel: string;
  area: string;
  solicitante: string;
  solicitanteFoto?: string | null;
  tempo: string;
  priority: IOSPriority;
  onClick?: () => void;
  dense?: boolean;
  className?: string;
  pendingForMe?: boolean;
  votesCount?: number;
  votesTotal?: number;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'SO';
}

export function IOSProposalCard({
  imageUrl,
  title,
  valueLabel,
  area,
  solicitante,
  solicitanteFoto,
  tempo,
  priority,
  onClick,
  dense = false,
  className,
  pendingForMe = false,
  votesCount,
  votesTotal,
}: IOSProposalCardProps) {
  const showProgress = typeof votesCount === 'number' && typeof votesTotal === 'number' && votesTotal > 0;
  const progressPct = showProgress ? Math.min(100, Math.round((votesCount! / votesTotal!) * 100)) : 0;
  if (dense) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'group w-full text-left bg-ios-card rounded-ios shadow-ios-card p-2.5 flex gap-3 items-center min-h-[88px]',
          'active:scale-[0.985] transition-transform duration-150',
          className
        )}
      >
        <div className="relative w-14 h-14 shrink-0 rounded-[12px] overflow-hidden bg-muted/60 flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <IOSPriorityBadge priority={priority} />
            <span className="text-[11px] text-ios-gray truncate">{area}</span>
            {pendingForMe && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full bg-ios-blue/15 text-ios-blue text-[10px] font-bold shrink-0">
                <Vote className="h-2.5 w-2.5" /> Você
              </span>
            )}
          </div>
          <h3 className="text-[14px] font-semibold leading-tight text-ios-text line-clamp-1">
            {title}
          </h3>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-[12px] text-ios-gray truncate">{solicitante} · {tempo}</span>
            <span className="text-[14px] font-bold tabular-nums text-ios-text shrink-0">{valueLabel}</span>
          </div>
          {showProgress && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-ios-blue" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="text-[10px] text-ios-gray tabular-nums shrink-0">{votesCount}/{votesTotal}</span>
            </div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-ios-gray/60 shrink-0 group-active:translate-x-0.5 transition-transform" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full text-left bg-ios-card rounded-ios shadow-ios-card p-3.5 flex gap-3.5 items-stretch min-h-[164px]',
        'active:scale-[0.985] transition-transform duration-150',
        className
      )}
    >
      <div className="relative w-[108px] shrink-0 self-stretch rounded-[16px] overflow-hidden bg-muted/60 flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <IOSPriorityBadge priority={priority} />
            {pendingForMe && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ios-blue/15 text-ios-blue text-[10px] font-bold">
                <Vote className="h-3 w-3" /> Aguardando seu voto
              </span>
            )}
          </div>
          <h3 className="text-[16px] font-semibold leading-snug text-ios-text line-clamp-2">
            {title}
          </h3>
          <p className="text-[18px] font-bold tabular-nums leading-none text-ios-text">
            {valueLabel}
          </p>
          {showProgress && (
            <div className="flex items-center gap-2 pt-0.5">
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-ios-blue transition-all" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="text-[10px] text-ios-gray tabular-nums shrink-0">{votesCount}/{votesTotal}</span>
            </div>
          )}
        </div>
        <div className="space-y-1.5 pt-1.5">
          <p className="text-[12px] text-ios-gray leading-tight truncate">
            {area}
          </p>
          <div className="flex items-start gap-1.5 min-w-0">
            <Avatar className="h-5 w-5 shrink-0 mt-0.5">
              {solicitanteFoto && <AvatarImage src={solicitanteFoto} alt={solicitante} />}
              <AvatarFallback className="text-[9px] font-semibold bg-ios-blue/10 text-ios-blue">
                {initials(solicitante)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex flex-col leading-tight">
              <span className="text-[12px] font-medium text-ios-text/80 truncate">{solicitante}</span>
              <span className="text-[11px] text-ios-gray truncate">Solicitado {tempo}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="shrink-0 self-center pr-1">
        <ChevronRight className="h-5 w-5 text-ios-gray/60 group-active:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}

