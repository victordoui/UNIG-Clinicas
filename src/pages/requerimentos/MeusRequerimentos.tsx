import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useStudentProfile } from '@/hooks/useStudentData';
import { useRequirementsList, RequirementFilters } from '@/hooks/useRequirements';
import { RequirementListCard } from '@/components/requerimentos/RequirementListCard';
import { RequirementFiltersBar } from '@/components/requerimentos/RequirementFilters';
import { NewRequirementDialog } from '@/components/requerimentos/NewRequirementDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';

export default function MeusRequerimentos() {
  const { data: student } = useStudentProfile();
  const [filters, setFilters] = useState<RequirementFilters>({ status: 'all', priority: 'all', categoryId: 'all' });
  const { data: reqs = [], isLoading } = useRequirementsList({ scope: 'mine', studentId: student?.id, filters });

  return (
    <MainLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" />Meus requerimentos</h1>
            <p className="text-muted-foreground text-sm">Acompanhe suas solicitações acadêmicas, financeiras e documentais.</p>
          </div>
          <NewRequirementDialog studentId={student?.id} />
        </div>

        <RequirementFiltersBar value={filters} onChange={setFilters} />

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>}
        {!isLoading && reqs.length === 0 && (
          <div className="text-center py-12 border rounded-lg bg-muted/30">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum requerimento encontrado.</p>
          </div>
        )}
        <div className="space-y-2">
          {reqs.map((r: any) => <RequirementListCard key={r.id} req={r} />)}
        </div>
      </div>
    </MainLayout>
  );
}
