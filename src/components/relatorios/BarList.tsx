interface Item { label: string; value: number; hint?: string; }

export function BarList({ items, max, valueFormatter }: {
  items: Item[]; max?: number; valueFormatter?: (v: number) => string;
}) {
  if (!items.length) return <p className="text-sm text-muted-foreground py-6 text-center">Sem dados no período.</p>;
  const maxVal = max ?? Math.max(...items.map(i => i.value), 1);
  return (
    <ul className="space-y-2">
      {items.map((it, i) => {
        const pct = (it.value / maxVal) * 100;
        return (
          <li key={i}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="truncate">{it.label}</span>
              <span className="tabular-nums font-medium">{valueFormatter ? valueFormatter(it.value) : it.value}</span>
            </div>
            <div className="h-2 rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            {it.hint && <p className="text-xs text-muted-foreground mt-0.5">{it.hint}</p>}
          </li>
        );
      })}
    </ul>
  );
}
