import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCourses, useSubjects } from '@/hooks/useAcademicData';
import { SubjectFormDialog } from '@/components/academico/SubjectFormDialog';
import { useCanReadAcademic, useCanWriteAcademic } from '@/components/academico/StaffOnly';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Layers3, Plus } from 'lucide-react';

export default function Matriz() {
  const canRead = useCanReadAcademic();
  const canWrite = useCanWriteAcademic();
  const { data: courses = [] } = useCourses();
  const [courseId, setCourseId] = useState<string>('');
  const { data: subjects = [], isLoading } = useSubjects({ courseId });

  const course = courses.find((c: any) => c.id === courseId);

  const bySemester = useMemo(() => {
    const map = new Map<number, any[]>();
    subjects.forEach((s: any) => {
      const k = s.semester ?? 0;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [subjects]);

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Layers3 className="h-6 w-6 text-primary" />Matriz Curricular</h1>
          <p className="text-muted-foreground text-sm">Disciplinas de cada curso, agrupadas por semestre.</p>
        </div>

        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="w-full md:w-[320px]"><SelectValue placeholder="Selecione um curso" /></SelectTrigger>
          <SelectContent>{courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>

        {!courseId ? <p className="text-sm text-muted-foreground py-10 text-center">Selecione um curso acima para ver a matriz.</p> :
         isLoading ? <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div> :
         bySemester.length === 0 ? (
          <Card><CardContent className="p-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Nenhuma disciplina cadastrada para {course?.name}.</p>
            {canWrite && <SubjectFormDialog defaultCourseId={courseId} defaultSemester={1} trigger={<Button><Plus className="h-4 w-4 mr-1" />Adicionar disciplina</Button>} />}
          </CardContent></Card>
         ) : (
          <div className="space-y-4">
            {bySemester.map(([sem, list]) => (
              <Card key={sem}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{sem}º Semestre <Badge variant="secondary" className="ml-2">{list.length}</Badge></h3>
                    {canWrite && <SubjectFormDialog defaultCourseId={courseId} defaultSemester={sem} trigger={<Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" />Adicionar</Button>} />}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {list.map((s: any) => (
                      <div key={s.id} className="border rounded-md p-3 flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-mono text-muted-foreground">{s.code}</div>
                          <div className="font-medium text-sm">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.workload_hours}h{s.professor?.full_name ? ` · ${s.professor.full_name}` : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
         )
        }
      </div>
    </MainLayout>
  );
}
