import { MainLayout } from '@/components/layout/MainLayout';
import { useTuitionCharges, useAllStudentScholarships } from '@/hooks/useFinance';
import { useCanReadAcademic } from '@/components/academico/StaffOnly';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';
import { formatBRL, formatMonthRef } from '@/lib/finance';

export default function RelatoriosFinanceiros() {
  const canRead = useCanReadAcademic();
  const { data: charges = [], isLoading } = useTuitionCharges();
  const { data: scholarships = [] } = useAllStudentScholarships();

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;

  // Arrecadação por mês (últimos 6 meses)
  const byMonth: Record<string, { paid: number; pending: number }> = {};
  charges.forEach((c: any) => {
    const key = c.reference_month?.slice(0, 7);
    if (!key) return;
    byMonth[key] = byMonth[key] ?? { paid: 0, pending: 0 };
    const amt = Number(c.net_amount ?? 0);
    if (c.status === 'pago') byMonth[key].paid += amt;
    else byMonth[key].pending += amt;
  });
  const months = Object.keys(byMonth).sort().slice(-6);
  const maxVal = Math.max(1, ...months.map((m) => byMonth[m].paid + byMonth[m].pending));

  // Inadimplência por curso
  const byCourse: Record<string, { total: number; overdue: number; name: string }> = {};
  const today = new Date().toISOString().slice(0, 10);
  charges.forEach((c: any) => {
    const cid = c.course_id ?? 'sem_curso';
    byCourse[cid] = byCourse[cid] ?? { total: 0, overdue: 0, name: c.course?.name ?? 'Sem curso' };
    byCourse[cid].total += 1;
    if ((c.status === 'pendente' || c.status === 'em_negociacao') && c.due_date < today) byCourse[cid].overdue += 1;
  });

  // Ranking de bolsas
  const byProgram: Record<string, { name: string; count: number }> = {};
  scholarships.forEach((l: any) => {
    const id = l.scholarship?.id ?? 'x';
    byProgram[id] = byProgram[id] ?? { name: l.scholarship?.name ?? '—', count: 0 };
    byProgram[id].count += 1;
  });
  const ranking = Object.values(byProgram).sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" />Relatórios financeiros</h1>
          <p className="text-muted-foreground text-sm">Indicadores consolidados da tesouraria.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Arrecadação (últimos meses)</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-40" /> : months.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Sem dados.</p> : (
              <div className="space-y-3">
                {months.map((m) => {
                  const paid = byMonth[m].paid; const pending = byMonth[m].pending; const total = paid + pending;
                  return (
                    <div key={m}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize font-medium">{formatMonthRef(m + '-01')}</span>
                        <span className="tabular-nums text-muted-foreground">{formatBRL(paid)} / {formatBRL(total)}</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                        <div className="bg-emerald-500 h-full" style={{ width: `${(paid / maxVal) * 100}%` }} />
                        <div className="bg-amber-400 h-full" style={{ width: `${(pending / maxVal) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Inadimplência por curso</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.values(byCourse).length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Sem dados.</p> :
                Object.values(byCourse).map((c) => {
                  const rate = c.total ? (c.overdue / c.total) * 100 : 0;
                  return (
                    <div key={c.name}>
                      <div className="flex justify-between text-sm mb-1"><span>{c.name}</span><span className="tabular-nums">{rate.toFixed(1)}% ({c.overdue}/{c.total})</span></div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="bg-rose-500 h-full" style={{ width: `${rate}%` }} /></div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Ranking de bolsas concedidas</CardTitle></CardHeader>
            <CardContent>
              {ranking.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Sem dados.</p> : (
                <ol className="space-y-2 text-sm">
                  {ranking.map((r, i) => (
                    <li key={r.name} className="flex justify-between border-b border-border last:border-0 pb-1">
                      <span><span className="text-muted-foreground mr-2">#{i + 1}</span>{r.name}</span>
                      <span className="tabular-nums font-medium">{r.count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
