import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCourses, useUnits, useDeleteRow } from '@/hooks/useAcademicData';
import { CourseFormDialog } from '@/components/academico/CourseFormDialog';
import { ConfirmDeleteDialog } from '@/components/academico/ConfirmDeleteDialog';
import { useCanReadAcademic, useCanWriteAcademic } from '@/components/academico/StaffOnly';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { School, Plus, Pencil, Search, Building2, Clock } from 'lucide-react';
import { statusBadgeClass, DEGREE_LABEL, MODALITY_LABEL } from '@/lib/academic';
import { toast } from '@/hooks/use-toast';

export default function Cursos() {
  const canRead = useCanReadAcademic();
  const canWrite = useCanWriteAcademic();
  const [filters, setFilters] = useState<any>({ search: '', unitId: 'all', modality: 'all', degreeType: 'all' });
  const { data: rows = [], isLoading } = useCourses(filters);
  const { data: units = [] } = useUnits();
  const del = useDeleteRow('courses', ['courses']);

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;
  const remove = async (id: string) => { try { await del.mutateAsync(id); toast({ title: 'Removido' }); } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><School className="h-6 w-6 text-primary" />Cursos</h1>
            <p className="text-muted-foreground text-sm">Cursos oferecidos pela instituição.</p>
          </div>
          {canWrite && <CourseFormDialog trigger={<Button><Plus className="h-4 w-4 mr-1" />Novo curso</Button>} />}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar curso" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="pl-8" />
          </div>
          <Select value={filters.unitId} onValueChange={(v) => setFilters({ ...filters, unitId: v })}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas unidades</SelectItem>{units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.degreeType} onValueChange={(v) => setFilters({ ...filters, degreeType: v })}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              {Object.entries(DEGREE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.modality} onValueChange={(v) => setFilters({ ...filters, modality: v })}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas modalidades</SelectItem>
              {Object.entries(MODALITY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div> :
         rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Nenhum curso encontrado.</p> :
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rows.map((c: any) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground font-mono">{c.code}</div>
                      <h3 className="font-semibold leading-tight">{c.name}</h3>
                    </div>
                    <Badge variant="outline" className={statusBadgeClass(c.status)}>{c.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 text-xs">
                    <Badge variant="secondary">{DEGREE_LABEL[c.degree_type] ?? c.degree_type}</Badge>
                    <Badge variant="secondary">{MODALITY_LABEL[c.modality] ?? c.modality}</Badge>
                    <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{c.duration_semesters} sem.</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {c.coordinator_name && <div>Coordenação: {c.coordinator_name}</div>}
                    {c.unit?.name && <div className="flex items-center gap-1"><Building2 className="h-3 w-3" />{c.unit.name}</div>}
                  </div>
                  {canWrite && <div className="flex justify-end gap-1 pt-2 border-t">
                    <CourseFormDialog row={c} trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>} />
                    <ConfirmDeleteDialog onConfirm={() => remove(c.id)} description={`Excluir ${c.name}?`} />
                  </div>}
                </CardContent>
              </Card>
            ))}
          </div>
        }
      </div>
    </MainLayout>
  );
}
