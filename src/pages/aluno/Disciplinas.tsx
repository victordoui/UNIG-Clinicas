import { MainLayout } from '@/components/layout/MainLayout';
import { EnrolledClassCard } from '@/components/aluno/EnrolledClassCard';
import { useStudentClasses, useStudentProfile } from '@/hooks/useStudentData';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen } from 'lucide-react';

export default function AlunoDisciplinas() {
  const { data: student } = useStudentProfile();
  const { data: enrollments = [], isLoading } = useStudentClasses(student?.id);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Minhas Disciplinas</h1>
          <p className="text-muted-foreground text-sm">
            {enrollments.length > 0 ? `${enrollments.length} disciplina(s) no período atual.` : 'Suas turmas do período letivo.'}
          </p>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
          </div>
        )}

        {!isLoading && enrollments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center space-y-2">
              <BookOpen className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Você ainda não está matriculado em nenhuma disciplina.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && enrollments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {enrollments.map((e: any) => <EnrolledClassCard key={e.id} enrollment={e} />)}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
