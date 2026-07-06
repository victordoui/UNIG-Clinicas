import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProfessors, useUnits, useDeleteRow } from '@/hooks/useAcademicData';
import { ProfessorFormDialog } from '@/components/academico/ProfessorFormDialog';
import { ConfirmDeleteDialog } from '@/components/academico/ConfirmDeleteDialog';
import { useCanReadAcademic, useCanWriteAcademic } from '@/components/academico/StaffOnly';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Plus, Pencil, Search } from 'lucide-react';
import { statusBadgeClass, ENTITY_STATUS_LABEL } from '@/lib/academic';
import { toast } from '@/hooks/use-toast';

export default function Professores() {
  const canRead = useCanReadAcademic();
  const canWrite = useCanWriteAcademic();
  const [filters, setFilters] = useState<any>({ search: '', unitId: 'all' });
  const { data: rows = [], isLoading } = useProfessors(filters);
  const { data: units = [] } = useUnits();
  const del = useDeleteRow('professors', ['professors']);

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;
  const remove = async (id: string) => { try { await del.mutateAsync(id); toast({ title: 'Removido' }); } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" />Professores</h1>
            <p className="text-muted-foreground text-sm">Corpo docente da instituição.</p>
          </div>
          {canWrite && <ProfessorFormDialog trigger={<Button><Plus className="h-4 w-4 mr-1" />Novo professor</Button>} />}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome, matrícula ou e-mail" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="pl-8" />
          </div>
          <Select value={filters.unitId} onValueChange={(v) => setFilters({ ...filters, unitId: v })}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas unidades</SelectItem>{units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <Card><CardContent className="p-0">
          {isLoading ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Nenhum professor encontrado.</p> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nome</TableHead><TableHead>Matrícula</TableHead><TableHead>Titulação</TableHead>
                  <TableHead>Departamento</TableHead><TableHead>E-mail</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell className="font-mono text-xs">{r.registration}</TableCell>
                      <TableCell className="text-sm capitalize">{r.title ?? '—'}</TableCell>
                      <TableCell className="text-sm">{r.department ?? '—'}</TableCell>
                      <TableCell className="text-sm">{r.email}</TableCell>
                      <TableCell><Badge variant="outline" className={statusBadgeClass(r.status)}>{ENTITY_STATUS_LABEL[r.status] ?? r.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {canWrite && <div className="flex justify-end gap-1">
                          <ProfessorFormDialog row={r} trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>} />
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
