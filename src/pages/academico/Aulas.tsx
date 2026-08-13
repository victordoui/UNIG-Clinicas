import { useState } from 'react';
import { CalendarDays, Printer } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCanReadAcademic } from '@/components/academico/StaffOnly';
import { InstitutionalScheduleGrid } from '@/components/academico/InstitutionalScheduleGrid';
import { TEST_SCHEDULES } from '@/lib/testSchedules';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Aulas() {
  const canRead = useCanReadAcademic();
  const [course, setCourse] = useState('Direito');
  const [classCode, setClassCode] = useState('DRM201');
  const courses = [...new Set(TEST_SCHEDULES.map((schedule) => schedule.course))];
  const classSchedules = TEST_SCHEDULES.filter((schedule) => schedule.course === course);
  const selected = TEST_SCHEDULES.find((schedule) => schedule.classCode === classCode) ?? TEST_SCHEDULES[0];
  const changeCourse = (value: string) => { setCourse(value); setClassCode(TEST_SCHEDULES.find((schedule) => schedule.course === value)?.classCode ?? ''); };

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;
  return <MainLayout><div className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3 print:hidden"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarDays className="h-6 w-6 text-primary" />Grade de Aulas</h1><p className="text-sm text-muted-foreground">Consulta semanal no formato institucional.</p></div><Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir grade</Button></div><div className="grid gap-2 sm:grid-cols-3 print:hidden"><Select value={course} onValueChange={changeCourse}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{courses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Select value={classCode} onValueChange={setClassCode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{classSchedules.map((item) => <SelectItem key={item.classCode} value={item.classCode}>{item.classCode} · {item.semester}</SelectItem>)}</SelectContent></Select><div className="flex items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">{selected.academicPeriod} · {selected.shift}</div></div><p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 print:hidden">Dados de teste autorizados. Serão substituídos pela grade publicada no Supabase e poderão ser removidos na implantação.</p><InstitutionalScheduleGrid schedule={selected} /></div></MainLayout>;
}
