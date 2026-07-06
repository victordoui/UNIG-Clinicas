import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Users, ClipboardCheck, GraduationCap, Loader2 } from 'lucide-react';
import { useProfessorClasses } from '@/hooks/useGrades';

export default function MinhasTurmas() {
  const { data: classes = [], isLoading } = useProfessorClasses();

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Minhas Turmas</h1>
          <p className="text-muted-foreground text-sm">Turmas em que você leciona neste período.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : classes.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma turma vinculada.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((c: any) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{c.subject?.name ?? c.name}</CardTitle>
                      <div className="text-xs text-muted-foreground mt-1">{c.code} · {c.academic_period}</div>
                    </div>
                    <Badge variant="outline">{c.shift}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {c.course?.name}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    {c.enrolled_count}/{c.capacity} matriculados
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/professor/turmas/${c.id}/notas`}>
                        <ClipboardCheck className="h-4 w-4 mr-1" /> Notas
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/professor/turmas/${c.id}/frequencia`}>
                        <Users className="h-4 w-4 mr-1" /> Presença
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
