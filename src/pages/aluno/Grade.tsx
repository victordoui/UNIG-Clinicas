import { MainLayout } from '@/components/layout/MainLayout';
import { WeeklyScheduleGrid } from '@/components/aluno/WeeklyScheduleGrid';
import { useStudentClasses, useStudentProfile } from '@/hooks/useStudentData';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays } from 'lucide-react';

export default function AlunoGrade() {
  const { data: student } = useStudentProfile();
  const { data: enrollments = [], isLoading } = useStudentClasses(student?.id);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Minha Grade Semanal</h1>
          <p className="text-muted-foreground text-sm">Visualização das aulas ao longo da semana.</p>
        </div>

        {isLoading && <Skeleton className="h-96 w-full" />}

        {!isLoading && enrollments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center space-y-2">
              <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Sem grade — matricule-se em disciplinas para ver seus horários.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && enrollments.length > 0 && <WeeklyScheduleGrid enrollments={enrollments} />}
      </div>
    </MainLayout>
  );
}
