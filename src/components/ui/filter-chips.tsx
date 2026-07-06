import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterChip {
  key: string;
  label: string;
  /** Optional value text shown after the label */
  value?: string;
  onRemove: () => void;
}

interface FilterChipsProps {
  chips: FilterChip[];
  onClearAll?: () => void;
  className?: string;
}

/**
 * Shows the currently active filters as removable chips.
 * Renders nothing when there are no chips.
 */
export function FilterChips({ chips, onClearAll, className }: FilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs text-muted-foreground">Filtros:</span>
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="gap-1 pl-2 pr-1 py-1 text-xs"
        >
          <span>
            {chip.label}
            {chip.value ? <span className="font-normal opacity-80">: {chip.value}</span> : null}
          </span>
          <button
            type="button"
            aria-label={`Remover filtro ${chip.label}`}
            onClick={chip.onRemove}
            className="rounded-full hover:bg-background/60 p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {onClearAll && chips.length > 1 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground"
          onClick={onClearAll}
        >
          Limpar tudo
        </Button>
      )}
    </div>
  );
}
