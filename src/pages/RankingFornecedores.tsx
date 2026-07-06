import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Award, Download, Trophy, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import {
  useSupplierRanking,
  TIER_LABEL,
  TIER_CLASS,
  type SupplierScorecardRow,
  type ScorecardRangeDays,
} from '@/hooks/useSupplierScorecard';
import { formatBRL } from '@/lib/purchaseLabels';
import { exportToCSV } from '@/lib/exportUtils';

const RANGE_OPTIONS: { value: ScorecardRangeDays; label: string }[] = [
  { value: 30, label: 'Últimos 30 dias' },
  { value: 90, label: 'Últimos 90 dias' },
  { value: 180, label: 'Últimos 6 meses' },
  { value: 365, label: 'Último ano' },
];

function fmtPct(n: number) {
  return `${Number(n).toFixed(1)}%`;
}

export default function RankingFornecedores() {
  const [days, setDays] = useState<ScorecardRangeDays>(90);
  const [selected, setSelected] = useState<SupplierScorecardRow | null>(null);
  const { data = [], isLoading } = useSupplierRanking(days);

  const ranked = useMemo(
    () => [...data].sort((a, b) => Number(b.score_final) - Number(a.score_final)),
    [data],
  );

  const handleExport = () => {
    exportToCSV(
      ranked.map((r, i) => ({
        posicao: i + 1,
        fornecedor: r.nome_fantasia,
        tier: TIER_LABEL[r.tier],
        score: Number(r.score_final).toFixed(2),
        nota_manual: Number(r.manual_avg).toFixed(2),
        entrega_no_prazo: fmtPct(r.on_time_rate),
        nf_no_prazo: fmtPct(r.nf_on_time_rate),
        divergencia: fmtPct(r.divergence_rate),
        resposta_cotacao: fmtPct(r.quote_response_rate),
        pedidos: r.orders_count,
        valor_total: Number(r.total_value).toFixed(2),
      })),
      `ranking-fornecedores-${days}d`,
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" /> Desempenho de Fornecedores
            </h1>
            <p className="text-sm text-muted-foreground">
              Score consolidado a partir de avaliação manual, entrega no prazo, NF, divergências e resposta de cotação.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v) as ScorecardRangeDays)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport} disabled={ranked.length === 0}>
              <Download className="h-4 w-4 mr-1" /> Exportar
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" /> {ranked.length} fornecedor(es)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4"><TableSkeleton rows={6} columns={8} /></div>
            ) : ranked.length === 0 ? (
              <EmptyState icon={Trophy} title="Sem dados ainda" description="Crie pedidos e avalie fornecedores para acompanhar o desempenho." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Manual</TableHead>
                      <TableHead className="text-right">No prazo</TableHead>
                      <TableHead className="text-right">Divergência</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranked.map((r, i) => (
                      <TableRow key={r.supplier_id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelected(r)}>
                        <TableCell className="font-semibold text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{r.nome_fantasia}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={TIER_CLASS[r.tier]}>{TIER_LABEL[r.tier]}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{Number(r.score_final).toFixed(1)}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(r.manual_avg / 20).toFixed(1)}⭐</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtPct(r.on_time_rate)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={Number(r.divergence_rate) > 10 ? 'text-destructive' : ''}>
                            {fmtPct(r.divergence_rate)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.orders_count}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBRL(r.total_value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selected.nome_fantasia}
                  <Badge variant="outline" className={TIER_CLASS[selected.tier]}>{TIER_LABEL[selected.tier]}</Badge>
                </SheetTitle>
                <SheetDescription>Score final: <span className="font-semibold text-foreground">{Number(selected.score_final).toFixed(2)}</span></SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-3">
                <MetricRow label="Avaliação manual" value={`${Number(selected.manual_avg / 20).toFixed(2)} ⭐`} good={selected.manual_avg >= 80} />
                <MetricRow label="Entrega no prazo" value={fmtPct(selected.on_time_rate)} good={selected.on_time_rate >= 80} />
                <MetricRow label="NF enviada em até 48h" value={fmtPct(selected.nf_on_time_rate)} good={selected.nf_on_time_rate >= 80} />
                <MetricRow label="Divergências no recebimento" value={fmtPct(selected.divergence_rate)} good={selected.divergence_rate <= 10} invert />
                <MetricRow label="Resposta de cotação em 48h" value={fmtPct(selected.quote_response_rate)} good={selected.quote_response_rate >= 70} />
                <div className="pt-3 border-t flex justify-between text-sm">
                  <span className="text-muted-foreground">Pedidos no período</span>
                  <span className="font-medium">{selected.orders_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor total</span>
                  <span className="font-medium">{formatBRL(selected.total_value)}</span>
                </div>
                <div className="pt-3 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3 inline mr-1" />
                  Score = 30% manual + 25% prazo entrega + 15% NF + 15% (1 − divergência) + 15% resposta de cotação.
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}

function MetricRow({ label, value, good, invert }: { label: string; value: string; good: boolean; invert?: boolean }) {
  const Icon = good ? TrendingUp : TrendingDown;
  const cls = good ? 'text-emerald-600' : 'text-destructive';
  return (
    <div className="flex items-center justify-between border rounded-lg p-3">
      <span className="text-sm">{label}</span>
      <span className={`flex items-center gap-1 font-semibold ${cls}`}>
        <Icon className="h-4 w-4" /> {value}
      </span>
    </div>
  );
}
