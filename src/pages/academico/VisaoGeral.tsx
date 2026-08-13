import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, ClipboardCheck, LayoutGrid, MapPinned, Send, TriangleAlert } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCanReadAcademic } from '@/components/academico/StaffOnly';
import { useAcademicMeetings, usePublishedAcademicSchedules } from '@/hooks/useAcademicSchedules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const steps = [{ title: 'Grades', icon: LayoutGrid, to: '/academico/aulas' }, { title: 'Ensalamento', icon: MapPinned, to: '/academico/ensalamento' }, { title: 'Pendências', icon: TriangleAlert, to: '/academico/pendencias' }, { title: 'Validação', icon: ClipboardCheck, to: '/academico/analise-ensalamento' }, { title: 'Publicação', icon: Send, to: '/academico/publicacao' }];
export default function VisaoGeral() {
  const canRead = useCanReadAcademic();
  const { data: schedules = [] } = usePublishedAcademicSchedules();
  const { data: meetings = [] } = useAcademicMeetings();
  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão para acessar este módulo.</p></MainLayout>;
  const allocated = meetings.filter((meeting) => meeting.room).length;
  const pending = meetings.filter((meeting) => !meeting.room || !meeting.professor).length;
  return <MainLayout><div className="space-y-6"><div><div className="flex items-center gap-2"><CalendarDays className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold">Visão Geral Acadêmica</h1></div><p className="mt-1 text-sm text-muted-foreground">A grade é a fonte central para aulas, ensalamento, ocupação e publicação.</p></div><div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Grades publicadas</p><p className="mt-2 text-3xl font-bold">{schedules.length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Aulas ensaladas</p><p className="mt-2 text-3xl font-bold">{allocated}/{meetings.length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Pendências operacionais</p><p className="mt-2 text-3xl font-bold text-destructive">{pending}</p></CardContent></Card></div><Card><CardHeader><CardTitle className="text-base">Fluxo da Grade Acadêmica</CardTitle><CardDescription>Os indicadores acima são atualizados a partir das grades e encontros cadastrados.</CardDescription></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-5">{steps.map(({ title, icon: Icon, to }) => <Link key={title} to={to} className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/40"><Icon className="h-5 w-5 text-primary" /><div className="mt-4 flex items-center justify-between gap-2 text-sm font-semibold">{title}<ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div></Link>)}</div></CardContent></Card></div></MainLayout>;
}
