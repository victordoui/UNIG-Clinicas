import { MainLayout } from '@/components/layout/MainLayout';
import { GradesTable } from '@/components/aluno/GradesTable';
import { useStudentClasses, useStudentProfile } from '@/hooks/useStudentData';
import { Skeleton } from '@/components/ui/skeleton';

export default function AlunoNotas() {
  const { data: student } = useStudentProfile();
  const { data: enrollments = [], isLoading } = useStudentClasses(student?.id);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Notas e Frequência</h1>
          <p className="text-muted-foreground text-sm">Acompanhe seu desempenho por disciplina.</p>
        </div>

        {isLoading ? <Skeleton className="h-72 w-full" /> : <GradesTable enrollments={enrollments} />}
      </div>
    </MainLayout>
  );
}
