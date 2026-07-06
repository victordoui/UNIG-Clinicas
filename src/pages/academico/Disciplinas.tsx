import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSubjects, useCourses, useDeleteRow } from '@/hooks/useAcademicData';
import { SubjectFormDialog } from '@/components/academico/SubjectFormDialog';
import { ConfirmDeleteDialog } from '@/components/academico/ConfirmDeleteDialog';
import { useCanReadAcademic, useCanWriteAcademic } from '@/components/academico/StaffOnly';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers3, Plus, Pencil, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Disciplinas() {
  const canRead = useCanReadAcademic();
  const canWrite = useCanWriteAcademic();
  const [filters, setFilters] = useState<any>({ search: '', courseId: 'all' });
  const { data: rows = [], isLoading } = useSubjects(filters);
  const { data: courses = [] } = useCourses();
  const del = useDeleteRow('subjects', ['subjects']);

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;
  const remove = async (id: string) => { try { await del.mutateAsync(id); toast({ title: 'Removido' }); } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Layers3 className="h-6 w-6 text-primary" />Disciplinas</h1>
            <p className="text-muted-foreground text-sm">Disciplinas vinculadas aos cursos.</p>
          </div>
          {canWrite && <SubjectFormDialog trigger={<Button><Plus className="h-4 w-4 mr-1" />Nova disciplina</Button>} />}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar disciplina" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="pl-8" />
          </div>
          <Select value={filters.courseId} onValueChange={(v) => setFilters({ ...filters, courseId: v })}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos cursos</SelectItem>{courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <Card><CardContent className="p-0">
          {isLoading ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Nenhuma disciplina encontrada.</p> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Semestre</TableHead>
                  <TableHead>Carga horária</TableHead><TableHead>Curso</TableHead><TableHead>Professor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.code}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.semester}º</TableCell>
                      <TableCell>{r.workload_hours}h</TableCell>
                      <TableCell className="text-sm">{r.course?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm">{r.professor?.full_name ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        {canWrite && <div className="flex justify-end gap-1">
                          <SubjectFormDialog row={r} trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>} />
                          <ConfirmDeleteDialog onConfirm={() => remove(r.id)} description={`Excluir ${r.name}?`} />
                        </div>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent></Card>
      </div>
    </MainLayout>
  );
}
