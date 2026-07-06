import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveUnitIcon } from "@/lib/iconRegistry";

export interface UnitLabelProps {
  unit?: string | null;
  shortName?: string | null;
  size?: "sm" | "md" | "lg" | number;
  showName?: boolean;
  showAbbreviation?: boolean;
  variant?: "default" | "compact" | "badge" | "select" | "table";
  global?: boolean;
  className?: string;
  emptyLabel?: string;
}

const SIZE_MAP = { sm: 14, md: 18, lg: 22 } as const;

export function UnitLabel({
  unit,
  shortName,
  size = "md",
  showName = true,
  showAbbreviation = false,
  variant = "default",
  global = false,
  className,
  emptyLabel = "—",
}: UnitLabelProps) {
  const iconSize = typeof size === "number" ? size : SIZE_MAP[size];

  if (global) {
    return (
      <span className={cn("inline-flex items-center gap-2 font-medium", className)}>
        <Globe className="text-amber-500" style={{ width: iconSize, height: iconSize }} />
        {showName && <span>Todas as Unidades</span>}
      </span>
    );
  }

  if (!unit) {
    return <span className={cn("text-muted-foreground", className)}>{emptyLabel}</span>;
  }

  const entry = resolveUnitIcon(unit);
  const Icon = entry.icon;
  const label = showAbbreviation && shortName ? shortName : unit;

  if (variant === "badge") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
          "bg-muted/60 border border-border",
          className,
        )}
      >
        <Icon className={entry.colorClass} style={{ width: iconSize, height: iconSize }} />
        {showName && <span className="truncate">{label}</span>}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2 min-w-0", className)}>
      <Icon className={cn(entry.colorClass, "shrink-0")} style={{ width: iconSize, height: iconSize }} />
      {showName && <span className="truncate">{label}</span>}
    </span>
  );
}
