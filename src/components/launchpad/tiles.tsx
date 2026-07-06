import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type Tone = "default" | "success" | "warning" | "danger" | "info";

const toneRing: Record<Tone, string> = {
  default: "border-border",
  success: "border-emerald-500/40",
  warning: "border-amber-500/50",
  danger: "border-destructive/50",
  info: "border-primary/40",
};

const toneAccent: Record<Tone, string> = {
  default: "text-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-destructive",
  info: "text-primary",
};

const toneDot: Record<Tone, string> = {
  default: "bg-muted-foreground",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-destructive",
  info: "bg-primary",
};

type BaseProps = {
  to: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  tone?: Tone;
  loading?: boolean;
};

function TileShell({ to, children, tone = "default" }: { to: string; tone?: Tone; children: React.ReactNode }) {
  return (
    <Link to={to} className="block group">
      <Card
        className={cn(
          "relative h-[148px] p-4 flex flex-col justify-between overflow-hidden",
          "border-l-4 transition-all duration-200",
          "hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/60",
          toneRing[tone],
        )}
      >
        {children}
      </Card>
    </Link>
  );
}

export function KPITile({ to, icon: Icon, title, subtitle, value, unit, tone = "default", loading }: BaseProps & { value: number | string; unit?: string }) {
  return (
    <TileShell to={to} tone={tone}>
      <div className="flex items-start justify-between">
        <Icon className={cn("h-5 w-5", toneAccent[tone])} />
        <div className={cn("h-2 w-2 rounded-full", toneDot[tone])} />
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className={cn("text-4xl font-bold tracking-tight tabular-nums", toneAccent[tone])}>
            {loading ? "—" : value}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
      </div>
      <div className="text-sm font-medium text-foreground/90">{title}</div>
    </TileShell>
  );
}

export function MonitorTile({ to, icon: Icon, title, subtitle, value, threshold = { warn: 5, danger: 10 }, loading }: BaseProps & { value: number; threshold?: { warn: number; danger: number } }) {
  const tone: Tone = value >= threshold.danger ? "danger" : value >= threshold.warn ? "warning" : "success";
  return <KPITile to={to} icon={Icon} title={title} subtitle={subtitle} value={value} tone={tone} loading={loading} />;
}

export function LinkTile({ to, icon: Icon, title, subtitle, tone = "info" }: BaseProps) {
  return (
    <TileShell to={to} tone={tone}>
      <Icon className={cn("h-6 w-6", toneAccent[tone])} />
      <div>
        <div className="text-base font-semibold">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
      </div>
      <div className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Abrir →</div>
    </TileShell>
  );
}

export function NewsTile({ to, icon: Icon, title, items }: { to: string; icon: LucideIcon; title: string; items: string[] }) {
  return (
    <TileShell to={to} tone="info">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <ul className="space-y-1 overflow-hidden">
        {items.slice(0, 3).map((it, i) => (
          <li key={i} className="text-xs text-muted-foreground truncate">• {it}</li>
        ))}
        {items.length === 0 && <li className="text-xs text-muted-foreground">Sem novidades</li>}
      </ul>
      <div className="text-xs text-primary">Ver tudo →</div>
    </TileShell>
  );
}

export function TileGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground px-1">{label}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {children}
      </div>
    </section>
  );
}
