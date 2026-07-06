import { MainLayout } from '@/components/layout/MainLayout';
import { NewRequirementDialog } from '@/components/requerimentos/NewRequirementDialog';
import { useStudentProfile } from '@/hooks/useStudentData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

export default function NovoRequerimento() {
  const { data: student } = useStudentProfile();

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" />Novo requerimento</h1>
          <p className="text-muted-foreground text-sm">Abra uma solicitação e acompanhe pelo painel de requerimentos.</p>
        </div>
        <Card>
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><FileText className="h-7 w-7" /></div>
            <p className="text-sm text-muted-foreground max-w-md">Clique abaixo para preencher os dados do requerimento. Todos os campos e a categoria correta agilizam o atendimento.</p>
            <NewRequirementDialog studentId={student?.id} trigger={<Button>Abrir formulário</Button>} />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
