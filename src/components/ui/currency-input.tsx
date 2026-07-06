import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number;
  onChange: (value: number) => void;
}

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Input com máscara R$ pt-BR. Internamente trabalha em centavos. */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const display = formatBRL(value || 0);
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          R$
        </span>
        <Input
          ref={ref}
          inputMode="numeric"
          className={cn("pl-9 text-right tabular-nums", className)}
          value={display}
          onChange={(e) => {
            // Mantém apenas dígitos -> divide por 100
            const digits = e.target.value.replace(/\D/g, "");
            const next = digits ? Number(digits) / 100 : 0;
            onChange(next);
          }}
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";
