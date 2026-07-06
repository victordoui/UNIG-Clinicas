import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  to: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'sky' | 'indigo' | 'teal';
}

const toneMap = {
  blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
  emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
  amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
  violet: 'bg-violet-50 text-violet-600 group-hover:bg-violet-100',
  rose: 'bg-rose-50 text-rose-600 group-hover:bg-rose-100',
  sky: 'bg-sky-50 text-sky-600 group-hover:bg-sky-100',
  indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
  teal: 'bg-teal-50 text-teal-600 group-hover:bg-teal-100',
};

export function QuickAction({ title, description, icon: Icon, to, tone = 'blue' }: QuickActionProps) {
  return (
    <Link
      to={to}
      className="group rounded-xl border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all flex items-start gap-3 min-w-0"
    >
      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors', toneMap[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm text-foreground truncate">{title}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</div>}
      </div>
    </Link>
  );
}
