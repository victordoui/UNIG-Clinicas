import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ChargeListTable } from '@/components/financeiro/ChargeListTable';
import { ChargeFormDialog } from '@/components/financeiro/ChargeFormDialog';
import { BulkChargeGeneratorDialog } from '@/components/financeiro/BulkChargeGeneratorDialog';
import { useTuitionCharges, useDeleteCharge } from '@/hooks/useFinance';
import { useCourses } from '@/hooks/useAcademicData';
import { useCanReadAcademic, useCanWriteAcademic } from '@/components/academico/StaffOnly';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Plus, Search, Layers } from 'lucide-react';
import { CHARGE_STATUS_LABEL } from '@/lib/finance';
import { toast } from '@/hooks/use-toast';

export default function Mensalidades() {
  const canRead = useCanReadAcademic();
  const canWrite = useCanWriteAcademic();
  const [filters, setFilters] = useState<any>({ search: '', status: 'all', courseId: 'all', referenceMonth: '' });
  const { data: rows = [], isLoading } = useTuitionCharges(filters);
  const { data: courses = [] } = useCourses();
  const del = useDeleteCharge();

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;
  const remove = async (id: string) => { try { await del.mutateAsync(id); toast({ title: 'Removido' }); } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" />Mensalidades</h1>
            <p className="text-muted-foreground text-sm">Cobranças mensais dos alunos.</p>
          </div>
          {canWrite && (
            <div className="flex gap-2">
              <BulkChargeGeneratorDialog trigger={<Button variant="outline"><Layers className="h-4 w-4 mr-1" />Gerar em lote</Button>} />
              <ChargeFormDialog trigger={<Button><Plus className="h-4 w-4 mr-1" />Nova cobrança</Button>} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar aluno / matrícula / descrição" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="pl-8" />
          </div>
          <Input type="month" value={filters.referenceMonth?.slice(0, 7) ?? ''} onChange={(e) => setFilters({ ...filters, referenceMonth: e.target.value ? `${e.target.value}-01` : '' })} className="w-[160px]" />
          <Select value={filters.courseId} onValueChange={(v) => setFilters({ ...filters, courseId: v })}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos cursos</SelectItem>{courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos status</SelectItem>{Object.entries(CHARGE_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {isLoading ? <Skeleton className="h-64 w-full" /> : <ChargeListTable rows={rows} canWrite={canWrite} onDelete={remove} />}
      </div>
    </MainLayout>
  );
}
