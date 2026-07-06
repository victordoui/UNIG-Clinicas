import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useClasses, useCourses, useUnits } from '@/hooks/useAcademicData';
import { useCanReadAcademic } from '@/components/academico/StaffOnly';
import { WeeklyScheduleGrid } from '@/components/aluno/WeeklyScheduleGrid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { SHIFT_LABEL } from '@/lib/academic';
import { CalendarDays } from 'lucide-react';

export default function Aulas() {
  const canRead = useCanReadAcademic();
  const [filters, setFilters] = useState<any>({ courseId: 'all', unitId: 'all', shift: 'all' });
  const { data: classes = [], isLoading } = useClasses(filters);
  const { data: courses = [] } = useCourses();
  const { data: units = [] } = useUnits();

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;

  const enrollments = classes
    .filter((c: any) => Array.isArray(c.schedule) && c.schedule.length > 0)
    .map((c: any) => ({ class: c }));

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="h-6 w-6 text-primary" />Grade de Aulas</h1>
          <p className="text-muted-foreground text-sm">Grade semanal consolidada das turmas ativas.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={filters.unitId} onValueChange={(v) => setFilters({ ...filters, unitId: v })}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas unidades</SelectItem>{units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.courseId} onValueChange={(v) => setFilters({ ...filters, courseId: v })}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos cursos</SelectItem>{courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.shift} onValueChange={(v) => setFilters({ ...filters, shift: v })}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos turnos</SelectItem>
              {Object.entries(SHIFT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? <Skeleton className="h-96 w-full" /> :
         enrollments.length === 0 ? <p className="text-sm text-muted-foreground py-10 text-center">Nenhuma turma com horário cadastrado nos filtros atuais.</p> :
         <WeeklyScheduleGrid enrollments={enrollments} />
        }
      </div>
    </MainLayout>
  );
}
