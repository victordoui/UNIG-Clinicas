import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTone = "info" | "success" | "warning" | "danger" | "neutral" | "finance" | "primary";

const TONES: Record<KpiTone, { icon: string; ring: string }> = {
  primary: { icon: "bg-primary/10 text-primary", ring: "" },
  info:    { icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400", ring: "" },
  success: { icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", ring: "" },
  warning: { icon: "bg-amber-500/10 text-amber-600 dark:text-amber-500", ring: "" },
  danger:  { icon: "bg-red-500/10 text-red-600 dark:text-red-400", ring: "" },
  neutral: { icon: "bg-slate-500/10 text-slate-600 dark:text-slate-300", ring: "" },
  finance: { icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400", ring: "" },
};

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: KpiTone;
  hint?: string;
  pct?: number | null;
  onClick?: () => void;
  className?: string;
}

export function PatrimonyKpiCard({ label, value, icon: Icon, tone = "primary", hint, pct, onClick, className }: Props) {
  const t = TONES[tone];
  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border transition-all hover:shadow-md min-w-0 group",
        onClick && "cursor-pointer hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", t.icon)}>
          <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
        </div>
        {pct != null && (
          <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {pct.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate mb-1">{label}</p>
      <p className="text-xl md:text-2xl font-bold leading-tight break-words tabular-nums" title={String(value)}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{hint}</p>}
    </Card>
  );
}
