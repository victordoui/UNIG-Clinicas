import { Building2 } from "lucide-react";
import { UnitSelect, type UnitSelectProps } from "@/components/ui/UnitSelect";
import { cn } from "@/lib/utils";

interface Props extends Omit<UnitSelectProps, "includeAll" | "allLabel"> {
  label?: string;
}

/**
 * UnitSelect estilizado para barras de filtro:
 * inclui sempre a opção "Todas as Unidades" e mostra indicador
 * animado quando há filtro ativo.
 */
export function UnitFilter({ value, onChange, label, className, ...rest }: Props) {
  const active = !!value && value !== "all";
  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" />
        <span>{label ?? "Unidade"}</span>
        {active && (
          <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        )}
      </div>
      <UnitSelect
        value={value}
        onChange={onChange}
        includeAll
        className={cn(active && "ring-2 ring-primary/30")}
        {...rest}
      />
    </div>
  );
}
