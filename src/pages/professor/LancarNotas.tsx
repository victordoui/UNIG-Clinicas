import { Link, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { useClassRoster } from '@/hooks/useGrades';
import { GradeEntryTable } from '@/components/notas/GradeEntryTable';

export default function LancarNotas() {
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
            <h1 className="text-2xl font-bold">Lançamento de Notas</h1>
            <p className="text-muted-foreground text-sm">Digite as notas por avaliação e publique quando concluir.</p>
          </div>
        </div>
        {isLoading || !data ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <GradeEntryTable enrollments={data.enrollments} grades={data.grades} attendance={data.attendance} />
        )}
      </div>
    </MainLayout>
  );
}
