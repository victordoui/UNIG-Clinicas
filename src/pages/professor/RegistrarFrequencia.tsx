import { Link, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { useClassRoster } from '@/hooks/useGrades';
import { AttendanceGrid } from '@/components/notas/AttendanceGrid';

export default function RegistrarFrequencia() {
  const { classId } = useParams<{ classId: string }>();
  const { data, isLoading } = useClassRoster(classId);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/professor/turmas"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Registrar Frequência</h1>
            <p className="text-muted-foreground text-sm">Selecione a data e marque a presença dos alunos.</p>
          </div>
        </div>
        {isLoading || !data ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <AttendanceGrid enrollments={data.enrollments} attendance={data.attendance} />
        )}
      </div>
    </MainLayout>
  );
}
