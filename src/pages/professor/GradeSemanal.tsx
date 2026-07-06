import { MainLayout } from '@/components/layout/MainLayout';
import { WeeklyScheduleGrid } from '@/components/aluno/WeeklyScheduleGrid';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfessorClasses } from '@/hooks/useGrades';

export default function GradeSemanal() {
  const { data: classes = [], isLoading } = useProfessorClasses();
  const enrollments = classes.map((c: any) => ({ id: c.id, class: c }));

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Grade Semanal</h1>
          <p className="text-muted-foreground text-sm">Sua agenda semanal de aulas.</p>
        </div>
        {isLoading ? <Skeleton className="h-96 w-full" /> : <WeeklyScheduleGrid enrollments={enrollments} />}
      </div>
    </MainLayout>
  );
}
