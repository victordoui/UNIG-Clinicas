import { MainLayout } from '@/components/layout/MainLayout';
import { StudentReportCard } from '@/components/notas/StudentReportCard';
import { useStudentProfile } from '@/hooks/useStudentData';
import { useStudentReport } from '@/hooks/useGrades';
import { Skeleton } from '@/components/ui/skeleton';

export default function AlunoNotas() {
  const { data: student } = useStudentProfile();
  const { data, isLoading } = useStudentReport(student?.id);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Notas e Frequência</h1>
          <p className="text-muted-foreground text-sm">Acompanhe seu desempenho por disciplina.</p>
        </div>

        {isLoading || !data ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <StudentReportCard
            enrollments={data.enrollments}
            grades={data.grades}
            attendance={data.attendance}
          />
        )}
      </div>
    </MainLayout>
  );
}
