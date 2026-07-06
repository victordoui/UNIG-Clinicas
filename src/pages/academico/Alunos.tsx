import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useStudents, useCourses, useUnits, useDeleteRow } from '@/hooks/useAcademicData';
import { StudentFormDialog } from '@/components/academico/StudentFormDialog';
import { ConfirmDeleteDialog } from '@/components/academico/ConfirmDeleteDialog';
import { useCanReadAcademic, useCanWriteAcademic } from '@/components/academico/StaffOnly';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Plus, Pencil, Search } from 'lucide-react';
import { statusBadgeClass, ENROLLMENT_STATUS_LABEL } from '@/lib/academic';
import { toast } from '@/hooks/use-toast';

export default function Alunos() {
  const canRead = useCanReadAcademic();
  const canWrite = useCanWriteAcademic();
  const [filters, setFilters] = useState<any>({ search: '', courseId: 'all', unitId: 'all', status: 'all' });
  const { data: rows = [], isLoading } = useStudents(filters);
  const { data: courses = [] } = useCourses();
  const { data: units = [] } = useUnits();
  const del = useDeleteRow('students', ['students']);

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;

  const remove = async (id: string) => {
    try { await del.mutateAsync(id); toast({ title: 'Aluno removido' }); }
    catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="h-6 w-6 text-primary" />Alunos</h1>
            <p className="text-muted-foreground text-sm">Gestão dos alunos da instituição.</p>
          </div>
          {canWrite && <StudentFormDialog trigger={<Button><Plus className="h-4 w-4 mr-1" />Novo aluno</Button>} />}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome, matrícula ou e-mail" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="pl-8" />
          </div>
          <Select value={filters.courseId} onValueChange={(v) => setFilters({ ...filters, courseId: v })}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos cursos</SelectItem>{courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.unitId} onValueChange={(v) => setFilters({ ...filters, unitId: v })}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas unidades</SelectItem>{units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="trancada">Trancada</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card><CardContent className="p-0">
          {isLoading ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Nenhum aluno encontrado.</p> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nome</TableHead><TableHead>Matrícula</TableHead><TableHead>E-mail</TableHead>
                  <TableHead>Curso</TableHead><TableHead>Unidade</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell className="font-mono text-xs">{r.registration}</TableCell>
                      <TableCell className="text-sm">{r.email}</TableCell>
                      <TableCell className="text-sm">{r.course?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm">{r.unit?.name ?? '—'}</TableCell>
                      <TableCell><Badge variant="outline" className={statusBadgeClass(r.enrollment_status)}>{ENROLLMENT_STATUS_LABEL[r.enrollment_status] ?? r.enrollment_status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {canWrite && <div className="flex justify-end gap-1">
                          <StudentFormDialog row={r} trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>} />
                          <ConfirmDeleteDialog onConfirm={() => remove(r.id)} description={`Excluir ${r.full_name}?`} />
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
