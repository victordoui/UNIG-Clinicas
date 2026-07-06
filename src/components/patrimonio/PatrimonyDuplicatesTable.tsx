import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Copy, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { AssetsAggregates } from "@/hooks/useAssets";

export function PatrimonyDuplicatesTable({ aggregates }: { aggregates: AssetsAggregates }) {
  const nav = useNavigate();
  const dups = aggregates.duplicates.slice(0, 50);

  return (
    <Card className="p-0 overflow-hidden rounded-xl">
      <div className="p-4 border-b flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center">
          <Copy className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Duplicidades de patrimônio</h3>
          <p className="text-xs text-muted-foreground">Números de patrimônio que aparecem em mais de um bem</p>
        </div>
        {dups.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => nav("/patrimonio/itens?filter=duplicados")} className="gap-1">
            Ver itens <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        {dups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma duplicidade detectada 🎉</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Patrimônio</TableHead>
                <TableHead className="text-right">Ocorrências</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dups.map((d) => (
                <TableRow key={d.asset_number}>
                  <TableCell className="font-mono text-xs">{d.asset_number}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{d.count}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm"
                      onClick={() => nav(`/patrimonio/itens?search=${encodeURIComponent(d.asset_number)}`)}
                      className="gap-1">
                      Analisar <ChevronRight className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  );
}
