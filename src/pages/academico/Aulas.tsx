import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCanReadAcademic } from '@/components/academico/StaffOnly';
import { InstitutionalScheduleGrid } from '@/components/academico/InstitutionalScheduleGrid';
import { DEMO_SCHEDULES } from '@/lib/demoSchedules';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarDays, Printer } from 'lucide-react';

export default function Aulas() {
  const canRead = useCanReadAcademic();
  const [selectedCourse, setSelectedCourse] = useState('Direito');
  const [selectedCode, setSelectedCode] = useState('DRM201');
  const selected = DEMO_SCHEDULES.find((schedule) => schedule.classCode === selectedCode) ?? DEMO_SCHEDULES[0];
  const courses = [...new Set(DEMO_SCHEDULES.map((schedule) => schedule.course))];
  const classesForCourse = DEMO_SCHEDULES.filter((schedule) => schedule.course === selectedCourse);
  const selectCourse = (course: string) => { setSelectedCourse(course); setSelectedCode(DEMO_SCHEDULES.find((schedule) => schedule.course === course)?.classCode ?? ''); };

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;
  return <MainLayout><div className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3 print:hidden"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarDays className="h-6 w-6 text-primary" />Grade de Aulas</h1><p className="text-sm text-muted-foreground">Selecione o curso e a turma para consultar a grade semanal no formato institucional.</p></div><Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir grade</Button></div>
    <div className="grid gap-2 sm:grid-cols-3 print:hidden"><Select value={selectedCourse} onValueChange={selectCourse}><SelectTrigger><SelectValue placeholder="Selecione o curso" /></SelectTrigger><SelectContent>{courses.map((course) => <SelectItem key={course} value={course}>{course}</SelectItem>)}</SelectContent></Select><Select value={selectedCode} onValueChange={setSelectedCode}><SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger><SelectContent>{classesForCourse.map((schedule) => <SelectItem key={schedule.classCode} value={schedule.classCode}>{schedule.classCode} · {schedule.semester}</SelectItem>)}</SelectContent></Select><div className="flex items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">{selected.academicPeriod} · {selected.shift}</div></div>
    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 print:hidden">Dados fictícios para demonstração. A grade real será exibida neste mesmo padrão quando as turmas e horários forem cadastrados.</p>
    <InstitutionalScheduleGrid schedule={selected} />
  </div></MainLayout>;
}
