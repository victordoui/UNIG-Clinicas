import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function UnitStatusBadge({ active, className }: { active: boolean; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        active
          ? "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300"
          : "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {active ? "Ativa" : "Inativa"}
    </Badge>
  );
}
