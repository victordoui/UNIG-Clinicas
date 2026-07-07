import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const toneCls: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/15 text-emerald-700',
  warning: 'bg-amber-500/15 text-amber-700',
  danger: 'bg-rose-500/15 text-rose-700',
};

export function MetricCard({ label, value, hint, icon: Icon, tone = 'default' }: Props) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        {Icon && (
          <div className={cn('h-10 w-10 rounded-md grid place-items-center shrink-0', toneCls[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground truncate">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
