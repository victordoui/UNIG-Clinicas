import { useEffect, useState } from 'react';
import { CalendarDays, Printer } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCanReadAcademic } from '@/components/academico/StaffOnly';
import { InstitutionalScheduleGrid } from '@/components/academico/InstitutionalScheduleGrid';
import { usePublishedAcademicSchedules } from '@/hooks/useAcademicSchedules';
import { TEST_SCHEDULES } from '@/lib/testSchedules';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Aulas() {
  const canRead = useCanReadAcademic();
  const { data: publishedSchedules = [], isLoading } = usePublishedAcademicSchedules();
  const schedules = publishedSchedules.length > 0 ? publishedSchedules : TEST_SCHEDULES;
  const [classCode, setClassCode] = useState(schedules[0].classCode);
  const selected = schedules.find((schedule) => schedule.classCode === classCode) ?? schedules[0];
  useEffect(() => { if (!schedules.some((schedule) => schedule.classCode === classCode)) setClassCode(schedules[0].classCode); }, [classCode, schedules]);
  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;
  return <MainLayout><div className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3 print:hidden"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarDays className="h-6 w-6 text-primary" />Grade de Aulas</h1><p className="text-sm text-muted-foreground">Consulta semanal no formato institucional.</p></div><Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir grade</Button></div><div className="grid gap-2 sm:grid-cols-2 print:hidden"><Select value={classCode} onValueChange={setClassCode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{schedules.map((item) => <SelectItem key={item.classCode} value={item.classCode}>{item.course} · {item.classCode} · {item.semester}</SelectItem>)}</SelectContent></Select><div className="flex items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">{selected.academicPeriod} · {selected.shift}</div></div><p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 print:hidden">{publishedSchedules.length > 0 ? 'Dados de teste carregados do Supabase.' : isLoading ? 'Carregando grade publicada do Supabase…' : 'Prévia local de teste: a grade publicada será carregada quando a sessão tiver acesso ao Supabase.'}</p><InstitutionalScheduleGrid schedule={selected} /></div></MainLayout>;
}
