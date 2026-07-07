import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, GraduationCap, CheckCircle2, TrendingUp, CalendarCheck } from 'lucide-react';
import { ReportFilters } from '@/components/relatorios/ReportFilters';
import { MetricCard } from '@/components/relatorios/MetricCard';
import { BarList } from '@/components/relatorios/BarList';
import { ExportCsvButton } from '@/components/relatorios/ExportCsvButton';
import { useAcademicReport, useClassesList, useCoursesList, useUnitsList } from '@/hooks/useReports';
import type { Filters } from '@/lib/reports';
import { avg, fmtNum, fmtPct, pct } from '@/lib/reports';

export default function RelatoriosAcademicos() {
  const [filters, setFilters] = useState<Filters>({ preset: 'year' });
  const { data: courses = [] } = useCoursesList();
  const { data: classes = [] } = useClassesList(filters.courseId);
  const { data: units = [] } = useUnitsList();
  const { data, isLoading } = useAcademicReport(filters);

  const stats = useMemo(() => {
    const enrollments = data?.enrollments ?? [];
    const grades = data?.grades ?? [];
    const attendance = data?.attendance ?? [];

    const totalEnroll = enrollments.length;
    const activeEnroll = enrollments.filter((e: any) => e.status === 'ativa' || e.status === 'matriculada' || e.status === 'ativo').length;

    const scores = grades.map((g: any) => (g.max_score ? (Number(g.score) / Number(g.max_score)) * 10 : Number(g.score))).filter(n => !isNaN(n));
    const avgScore = avg(scores);
    const approved = scores.filter(s => s >= 6).length;
    const approvalRate = pct(approved, scores.length);

    const totalAtt = attendance.length;
    const present = attendance.filter((a: any) => a.status === 'presente' || a.status === 'present').length;
    const attendanceRate = pct(present, totalAtt);

    // Breakdowns
    const byCourse: Record<string, { label: string; value: number }> = {};
    for (const e of enrollments) {
      const cname = e.class?.course?.name ?? '—';
      byCourse[cname] = byCourse[cname] || { label: cname, value: 0 };
      byCourse[cname].value++;
    }

    const byClass: Record<string, { total: number; approved: number; label: string }> = {};
    for (const g of grades) {
      const enr = enrollments.find((e: any) => e.id === g.enrollment_id);
      const label = enr?.class?.name ?? '—';
      const s = g.max_score ? (Number(g.score) / Number(g.max_score)) * 10 : Number(g.score);
      byClass[label] = byClass[label] || { total: 0, approved: 0, label };
      byClass[label].total++;
      if (s >= 6) byClass[label].approved++;
    }

    const attByClass: Record<string, { total: number; present: number; label: string }> = {};
    for (const a of attendance) {
      const enr = enrollments.find((e: any) => e.id === a.enrollment_id);
      const label = enr?.class?.name ?? '—';
      attByClass[label] = attByClass[label] || { total: 0, present: 0, label };
      attByClass[label].total++;
      if (a.status === 'presente' || a.status === 'present') attByClass[label].present++;
    }

    return {
      totalEnroll, activeEnroll, avgScore, approvalRate, attendanceRate,
      byCourse: Object.values(byCourse).sort((a, b) => b.value - a.value),
      byClass: Object.values(byClass).map(c => ({ label: c.label, value: pct(c.approved, c.total), hint: `${c.approved}/${c.total} avaliações aprovadas` })).sort((a, b) => b.value - a.value),
      attByClass: Object.values(attByClass).map(c => ({ label: c.label, value: pct(c.present, c.total), hint: `${c.present}/${c.total} presenças` })).sort((a, b) => b.value - a.value),
    };
  }, [data]);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Relatórios Acadêmicos</h1>
            <p className="text-sm text-muted-foreground">Matrículas, aprovação e frequência agregadas.</p>
          </div>
        </div>

        <ReportFilters
          value={filters}
          onChange={setFilters}
          courses={courses as any}
          classes={classes as any}
          units={units as any}
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Matrículas no período" value={fmtNum(stats.totalEnroll, 0)} icon={GraduationCap} />
              <MetricCard label="Matrículas ativas" value={fmtNum(stats.activeEnroll, 0)} icon={CheckCircle2} tone="success" />
              <MetricCard label="Taxa de aprovação" value={fmtPct(stats.approvalRate)} icon={TrendingUp} tone={stats.approvalRate >= 70 ? 'success' : 'warning'} />
              <MetricCard label="Frequência média" value={fmtPct(stats.attendanceRate)} icon={CalendarCheck} tone={stats.attendanceRate >= 75 ? 'success' : 'warning'} hint={`Média geral: ${fmtNum(stats.avgScore, 2)}`} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Matrículas por curso</CardTitle>
                  <ExportCsvButton
                    rows={stats.byCourse.map(c => ({ curso: c.label, matriculas: c.value }))}
                    filename="matriculas-por-curso.csv"
                  />
                </CardHeader>
                <CardContent><BarList items={stats.byCourse} /></CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Aprovação por turma</CardTitle>
                  <ExportCsvButton
                    rows={stats.byClass.map(c => ({ turma: c.label, aprovacao_pct: c.value.toFixed(1) }))}
                    filename="aprovacao-por-turma.csv"
                  />
                </CardHeader>
                <CardContent>
                  <BarList items={stats.byClass} max={100} valueFormatter={v => fmtPct(v)} />
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Frequência por turma</CardTitle>
                  <ExportCsvButton
                    rows={stats.attByClass.map(c => ({ turma: c.label, frequencia_pct: c.value.toFixed(1) }))}
                    filename="frequencia-por-turma.csv"
                  />
                </CardHeader>
                <CardContent>
                  <BarList items={stats.attByClass} max={100} valueFormatter={v => fmtPct(v)} />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
