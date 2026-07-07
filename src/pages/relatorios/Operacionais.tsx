import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, ClipboardList, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ReportFilters } from '@/components/relatorios/ReportFilters';
import { MetricCard } from '@/components/relatorios/MetricCard';
import { BarList } from '@/components/relatorios/BarList';
import { ExportCsvButton } from '@/components/relatorios/ExportCsvButton';
import {
  useOperationalReport, useRequirementCategoriesList, useUnitsList,
} from '@/hooks/useReports';
import { avg, daysBetween, fmtNum, fmtPct, pct, type Filters } from '@/lib/reports';

const STATUS_OPTIONS = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_analise', label: 'Em análise' },
  { value: 'aguardando_aluno', label: 'Aguardando aluno' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'indeferido', label: 'Indeferido' },
  { value: 'cancelado', label: 'Cancelado' },
];

export default function RelatoriosOperacionais() {
  const [filters, setFilters] = useState<Filters>({ preset: '90d' });
  const { data: categories = [] } = useRequirementCategoriesList();
  const { data: units = [] } = useUnitsList();
  const { data: rows = [], isLoading } = useOperationalReport(filters);

  const stats = useMemo(() => {
    const total = rows.length;
    const openStatuses = ['aberto', 'em_analise', 'aguardando_aluno'];
    const open = rows.filter((r: any) => openStatuses.includes(r.status)).length;
    const done = rows.filter((r: any) => r.status === 'concluido').length;

    const times = rows
      .filter((r: any) => r.completed_at)
      .map((r: any) => daysBetween(r.created_at, r.completed_at));
    const avgTime = avg(times);

    // SLA: concluded within due_date OR within category.sla_days
    const withSla = rows.filter((r: any) => r.status === 'concluido');
    const onTime = withSla.filter((r: any) => {
      if (r.due_date && r.completed_at) return new Date(r.completed_at) <= new Date(r.due_date + 'T23:59:59');
      const slaDays = r.category?.sla_days;
      if (slaDays && r.completed_at) return daysBetween(r.created_at, r.completed_at) <= slaDays;
      return true;
    }).length;
    const slaRate = pct(onTime, withSla.length);

    const byStatus: Record<string, number> = {};
    for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    const statusItems = Object.entries(byStatus).map(([k, v]) => ({
      label: STATUS_OPTIONS.find(s => s.value === k)?.label ?? k, value: v,
    })).sort((a, b) => b.value - a.value);

    const byCategory: Record<string, number> = {};
    for (const r of rows) {
      const name = r.category?.name ?? '—';
      byCategory[name] = (byCategory[name] ?? 0) + 1;
    }
    const categoryItems = Object.entries(byCategory).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

    const byUnit: Record<string, number> = {};
    for (const r of rows) {
      const uid = r.student?.unit_id;
      const name = units.find((u: any) => u.id === uid)?.name ?? '—';
      byUnit[name] = (byUnit[name] ?? 0) + 1;
    }
    const unitItems = Object.entries(byUnit).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

    const byPriority: Record<string, number> = {};
    for (const r of rows) byPriority[r.priority ?? 'normal'] = (byPriority[r.priority ?? 'normal'] ?? 0) + 1;
    const priorityItems = Object.entries(byPriority).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

    return { total, open, done, avgTime, slaRate, statusItems, categoryItems, unitItems, priorityItems, resolutionRate: pct(done, total) };
  }, [rows, units]);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Relatórios Operacionais</h1>
            <p className="text-sm text-muted-foreground">Atendimento, requerimentos e cumprimento de SLA.</p>
          </div>
        </div>

        <ReportFilters
          value={filters}
          onChange={setFilters}
          units={units as any}
          categories={categories as any}
          statuses={STATUS_OPTIONS}
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Total no período" value={fmtNum(stats.total, 0)} icon={ClipboardList} />
              <MetricCard label="Em aberto" value={fmtNum(stats.open, 0)} icon={AlertTriangle} tone={stats.open > 0 ? 'warning' : 'success'} />
              <MetricCard label="Tempo médio (dias)" value={fmtNum(stats.avgTime, 1)} icon={Clock} />
              <MetricCard label="SLA cumprido" value={fmtPct(stats.slaRate)} icon={CheckCircle2} tone={stats.slaRate >= 80 ? 'success' : stats.slaRate >= 60 ? 'warning' : 'danger'} hint={`Resolução: ${fmtPct(stats.resolutionRate)}`} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Por status</CardTitle>
                  <ExportCsvButton rows={stats.statusItems.map(s => ({ status: s.label, total: s.value }))} filename="requerimentos-por-status.csv" />
                </CardHeader>
                <CardContent><BarList items={stats.statusItems} /></CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Por categoria</CardTitle>
                  <ExportCsvButton rows={stats.categoryItems.map(s => ({ categoria: s.label, total: s.value }))} filename="requerimentos-por-categoria.csv" />
                </CardHeader>
                <CardContent><BarList items={stats.categoryItems} /></CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Por unidade</CardTitle>
                  <ExportCsvButton rows={stats.unitItems.map(s => ({ unidade: s.label, total: s.value }))} filename="requerimentos-por-unidade.csv" />
                </CardHeader>
                <CardContent><BarList items={stats.unitItems} /></CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Por prioridade</CardTitle>
                  <ExportCsvButton rows={stats.priorityItems.map(s => ({ prioridade: s.label, total: s.value }))} filename="requerimentos-por-prioridade.csv" />
                </CardHeader>
                <CardContent><BarList items={stats.priorityItems} /></CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
