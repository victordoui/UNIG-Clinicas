import { cn } from '@/lib/utils';

export interface IOSFilterOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

interface IOSSegmentedFilterProps<T extends string = string> {
  options: IOSFilterOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}

export function IOSSegmentedFilter<T extends string = string>({ options, value, onChange, className }: IOSSegmentedFilterProps<T>) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto pl-0.5 pr-4 pb-1 snap-x snap-mandatory scroll-pl-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'shrink-0 snap-start inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-[13px] font-semibold transition-all duration-200',
              active
                ? 'bg-ios-blue text-white shadow-sm scale-[1.02]'
                : 'bg-ios-card text-ios-text/80 border border-border/40 hover:bg-muted/50'
            )}
          >
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={cn(
                  'tabular-nums text-[11px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full inline-flex items-center justify-center',
                  active ? 'bg-white/25 text-white' : 'bg-muted text-ios-text/60'
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
