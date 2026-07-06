import { MainLayout } from '@/components/layout/MainLayout';
import { StudentIdentityCard } from '@/components/aluno/StudentIdentityCard';
import { useStudentProfile } from '@/hooks/useStudentData';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserX } from 'lucide-react';

export default function AlunoPerfil() {
  const { data: student, isLoading } = useStudentProfile();

  return (
    <MainLayout>
      <div className="space-y-4 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground text-sm">Seus dados acadêmicos.</p>
        </div>

        {isLoading && <Skeleton className="h-40 w-full" />}

        {!isLoading && !student && (
          <Card>
            <CardContent className="py-12 text-center space-y-2">
              <UserX className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Não encontramos um registro de aluno vinculado ao seu e-mail. Procure a secretaria.
              </p>
            </CardContent>
          </Card>
        )}

        {student && <StudentIdentityCard student={student} />}
      </div>
    </MainLayout>
  );
}
