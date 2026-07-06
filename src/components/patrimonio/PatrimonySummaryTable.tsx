import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AssetsAggregates } from "@/hooks/useAssets";
import * as LucideIcons from "lucide-react";
import { Tag } from "lucide-react";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function CategorySummaryTable({ aggregates }: { aggregates: AssetsAggregates }) {
  return (
    <Card className="p-0 overflow-hidden rounded-xl">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Resumo por categoria</h3>
        <p className="text-xs text-muted-foreground">Quantidade, valor e representatividade</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Valor total</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aggregates.byCategory.map((c) => {
              const Icon = (c.icon && (LucideIcons as any)[c.icon]) || Tag;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4" style={c.color ? { color: c.color } : undefined} />
                      {c.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{c.count.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl(c.value)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{c.pct.toFixed(1)}%</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export function UnitSummaryTable({ aggregates }: { aggregates: AssetsAggregates }) {
  const units = aggregates.byUnit.filter((u) => u.id !== "__none__");
  if (!units.length) return null;
  return (
    <Card className="p-0 overflow-hidden rounded-xl">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Resumo por unidade</h3>
        <p className="text-xs text-muted-foreground">Quantidade e valor por unidade</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Valor total</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{u.count.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right tabular-nums">{brl(u.value)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{u.pct.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
