import { ChartNoAxesCombined, CheckCircle2, UsersRound } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCanReadAcademic } from '@/components/academico/StaffOnly';
import { useAcademicMeetings } from '@/hooks/useAcademicSchedules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AnaliseEnsalamento() {
  const canRead = useCanReadAcademic();
  const { data: meetings = [], isLoading } = useAcademicMeetings();
  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;

  const allocated = meetings.filter((meeting) => meeting.room);
  const capacityIssues = allocated.filter((meeting) => (meeting.class?.enrolled_count ?? 0) > (meeting.room?.capacity ?? 0));
  const occupancy = allocated.map((meeting) => ({
    ...meeting,
    enrollment: meeting.class?.enrolled_count ?? 0,
    capacity: meeting.room?.capacity ?? 0,
  })).sort((a, b) => (b.capacity ? b.enrollment / b.capacity : 0) - (a.capacity ? a.enrollment / a.capacity : 0));
  const average = occupancy.length ? Math.round(occupancy.reduce((sum, item) => sum + (item.capacity ? item.enrollment / item.capacity : 0), 0) / occupancy.length * 100) : 0;

  return <MainLayout><div className="space-y-6">
    <div><h1 className="flex items-center gap-2 text-2xl font-bold"><ChartNoAxesCombined className="h-6 w-6 text-primary" />Análise de Ensalamento</h1><p className="mt-1 text-sm text-muted-foreground">Leitura de capacidade baseada nas aulas ativas da grade.</p></div>
    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Aulas alocadas</p><p className="mt-2 text-3xl font-bold">{isLoading ? '—' : allocated.length}</p></CardContent></Card>
      <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Ocupação média</p><p className="mt-2 text-3xl font-bold">{isLoading ? '—' : `${average}%`}</p></CardContent></Card>
      <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Capacidade excedida</p><p className="mt-2 text-3xl font-bold text-destructive">{isLoading ? '—' : capacityIssues.length}</p></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle className="text-base">Uso por encontro</CardTitle></CardHeader><CardContent>{!isLoading && !occupancy.length ? <p className="py-8 text-center text-sm text-muted-foreground">Ainda não há encontros com sala para analisar.</p> : <div className="space-y-3">{occupancy.map((item) => { const rate = item.capacity ? Math.round(item.enrollment / item.capacity * 100) : 0; const exceeded = rate > 100; return <div key={item.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{item.class?.subject?.name ?? item.class?.name ?? 'Turma sem identificação'}</p><p className="mt-1 text-sm text-muted-foreground">{item.room?.code} · {item.room?.name}</p></div><Badge variant={exceeded ? 'destructive' : 'secondary'}>{item.enrollment}/{item.capacity || '—'} alunos · {rate}%</Badge></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className={exceeded ? 'h-full bg-destructive' : 'h-full bg-primary'} style={{ width: `${Math.min(rate, 100)}%` }} /></div></div>})}</div>}</CardContent></Card>
    {!isLoading && capacityIssues.length === 0 && allocated.length > 0 && <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-5 w-5" />Nenhuma aula excede a capacidade da sala no conjunto atual.</div>}
  </div></MainLayout>;
}
