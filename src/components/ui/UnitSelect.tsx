import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUnits } from "@/hooks/useUnits";
import { UnitLabel } from "@/components/ui/UnitLabel";
import { cn } from "@/lib/utils";

export interface UnitSelectProps {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  includeAll?: boolean;
  allLabel?: string;
  allValue?: string;
  required?: boolean;
  excludeUnit?: string | null;
}

/**
 * Select padronizado de Unidade. Use em qualquer formulário ou filtro
 * que precise selecionar uma unidade/campus.
 */
export function UnitSelect({
  value,
  onChange,
  placeholder = "Selecione a unidade…",
  disabled,
  className,
  includeAll = false,
  allLabel = "Todas as Unidades",
  allValue = "all",
  excludeUnit,
}: UnitSelectProps) {
  const { data: units = [], isLoading } = useUnits();
  const visible = excludeUnit ? units.filter((u) => u.name !== excludeUnit) : units;

  return (
    <Select value={value ?? undefined} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder}>
          {value === allValue ? (
            <UnitLabel global />
          ) : value ? (
            <UnitLabel unit={value} size="sm" />
          ) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value={allValue}>
            <UnitLabel global />
          </SelectItem>
        )}
        {visible.map((u) => (
          <SelectItem key={u.id} value={u.name}>
            <UnitLabel unit={u.name} shortName={u.shortName} size="sm" />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
