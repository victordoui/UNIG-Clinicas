import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { IOSFilterOption } from './IOSSegmentedFilter';

interface ConselhoFiltersSheetProps<T extends string> {
  children: React.ReactNode;
  options: IOSFilterOption<T>[];
  value: T;
  onChange: (v: T) => void;
}

export function ConselhoFiltersSheet<T extends string>({
  children,
  options,
  value,
  onChange,
}: ConselhoFiltersSheetProps<T>) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl border-t-0 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-center pt-1 pb-2">
          <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        <SheetHeader className="text-left">
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                  'w-full flex items-center justify-between px-4 h-12 rounded-2xl text-[15px] font-medium transition-colors',
                  active ? 'bg-ios-blue text-white' : 'bg-muted/50 text-foreground hover:bg-muted'
                )}
              >
                <span>{opt.label}</span>
                {typeof opt.count === 'number' && (
                  <span className={cn('text-[12px] font-semibold tabular-nums', active ? 'text-white/90' : 'text-muted-foreground')}>
                    {opt.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
