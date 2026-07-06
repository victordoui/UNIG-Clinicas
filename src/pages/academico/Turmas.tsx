import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useClasses, useCourses, useProfessors, useUnits, useDeleteRow } from '@/hooks/useAcademicData';
import { ClassFormDialog } from '@/components/academico/ClassFormDialog';
import { ClassEnrollmentsDrawer } from '@/components/academico/ClassEnrollmentsDrawer';
import { ConfirmDeleteDialog } from '@/components/academico/ConfirmDeleteDialog';
import { useCanReadAcademic, useCanWriteAcademic } from '@/components/academico/StaffOnly';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Pencil, Search, UserCog } from 'lucide-react';
import { SHIFT_LABEL, formatSchedule } from '@/lib/academic';
import { toast } from '@/hooks/use-toast';

export default function Turmas() {
  const canRead = useCanReadAcademic();
  const canWrite = useCanWriteAcademic();
  const [filters, setFilters] = useState<any>({ search: '', courseId: 'all', professorId: 'all', unitId: 'all', shift: 'all' });
  const { data: rows = [], isLoading } = useClasses(filters);
  const { data: courses = [] } = useCourses();
  const { data: professors = [] } = useProfessors();
  const { data: units = [] } = useUnits();
  const del = useDeleteRow('classes', ['classes']);

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;
  const remove = async (id: string) => { try { await del.mutateAsync(id); toast({ title: 'Removido' }); } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" />Turmas</h1>
            <p className="text-muted-foreground text-sm">Turmas por período, com horários e matrículas.</p>
          </div>
          {canWrite && <ClassFormDialog trigger={<Button><Plus className="h-4 w-4 mr-1" />Nova turma</Button>} />}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar turma" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="pl-8" />
          </div>
          <Select value={filters.courseId} onValueChange={(v) => setFilters({ ...filters, courseId: v })}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos cursos</SelectItem>{courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.professorId} onValueChange={(v) => setFilters({ ...filters, professorId: v })}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos professores</SelectItem>{professors.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.unitId} onValueChange={(v) => setFilters({ ...filters, unitId: v })}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas unidades</SelectItem>{units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.shift} onValueChange={(v) => setFilters({ ...filters, shift: v })}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos turnos</SelectItem>
              {Object.entries(SHIFT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card><CardContent className="p-0">
          {isLoading ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Nenhuma turma encontrada.</p> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Código</TableHead><TableHead>Turma</TableHead><TableHead>Disciplina</TableHead>
                  <TableHead>Professor</TableHead><TableHead>Período</TableHead><TableHead>Turno</TableHead>
                  <TableHead>Sala</TableHead><TableHead>Horários</TableHead><TableHead>Ocupação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.code}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm">{r.subject?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm">{r.professor?.full_name ?? '—'}</TableCell>
                      <TableCell className="text-sm">{r.academic_period}</TableCell>
                      <TableCell><Badge variant="secondary">{SHIFT_LABEL[r.shift] ?? r.shift}</Badge></TableCell>
                      <TableCell className="text-sm">{r.room ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{formatSchedule(r.schedule ?? [])}</TableCell>
                      <TableCell className="text-sm">{r.enrolled_count ?? 0}/{r.capacity}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <ClassEnrollmentsDrawer classId={r.id} className={r.name} trigger={<Button size="icon" variant="ghost" title="Matrículas"><UserCog className="h-4 w-4" /></Button>} />
                          {canWrite && <>
                            <ClassFormDialog row={r} trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>} />
                            <ConfirmDeleteDialog onConfirm={() => remove(r.id)} description={`Excluir ${r.name}?`} />
                          </>}
                        </div>
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
