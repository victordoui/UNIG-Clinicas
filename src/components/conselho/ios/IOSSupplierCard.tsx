import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface IOSSupplierCardProps {
  nome: string;
  valorUnit: string;
  qtd: number;
  frete: string;
  total: string;
  condicao?: string | null;
  selected?: boolean;
  isBest?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function IOSSupplierCard({
  nome, valorUnit, qtd, frete, total, condicao, selected, isBest, onSelect, className,
}: IOSSupplierCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative w-full text-left bg-ios-card rounded-ios shadow-ios-card p-4 flex items-start gap-3 transition-all duration-200',
        selected ? 'ring-2 ring-ios-blue' : 'ring-1 ring-border/40',
        'active:scale-[0.99]',
        className
      )}
    >
      {/* Radio */}
      <div
        className={cn(
          'mt-1 h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
          selected ? 'border-ios-blue bg-ios-blue' : 'border-ios-gray/40 bg-transparent'
        )}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[15px] font-semibold text-ios-text truncate">{nome}</p>
          {isBest && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ios-green/15 text-ios-green text-[10px] font-bold uppercase tracking-wide">
              <Check className="h-3 w-3" strokeWidth={3} />
              Melhor opção
            </span>
          )}
        </div>
        <p className="text-[20px] font-bold tabular-nums text-ios-text mt-1">{valorUnit}</p>
        <div className="mt-1 space-y-0.5 text-[12px] text-ios-gray">
          <p>{qtd} {qtd === 1 ? 'unidade' : 'unidades'}</p>
          <p>Frete: <span className="tabular-nums">{frete}</span></p>
          <p>Total: <span className="tabular-nums font-semibold text-ios-text">{total}</span></p>
        </div>
        {condicao && (
          <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded-md bg-ios-green/10 text-ios-green text-[11px] font-semibold">
            {condicao}
          </span>
        )}
      </div>
    </button>
  );
}
