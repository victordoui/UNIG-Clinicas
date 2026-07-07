import { formatBRL, formatDate, formatMonthRef } from '@/lib/finance';
import { ChargeStatusBadge } from './ChargeStatusBadge';

export function StudentFinancialTimeline({ charges }: { charges: any[] }) {
  if (!charges?.length) return <p className="text-sm text-muted-foreground text-center py-6">Sem histórico financeiro.</p>;
  return (
    <ol className="relative border-l border-border ml-3 space-y-4">
      {charges.map((c: any) => (
        <li key={c.id} className="ml-4">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium capitalize">{formatMonthRef(c.reference_month)}</p>
              <p className="text-xs text-muted-foreground">Vencimento: {formatDate(c.due_date)} · {formatBRL(c.net_amount)}</p>
              {c.paid_at && <p className="text-xs text-emerald-600">Pago em {formatDate(c.paid_at)}</p>}
            </div>
            <ChargeStatusBadge charge={c} />
          </div>
        </li>
      ))}
    </ol>
  );
}
