import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useRequirementsList, RequirementFilters, useUpdateRequirement } from '@/hooks/useRequirements';
import { RequirementFiltersBar } from '@/components/requerimentos/RequirementFilters';
import { RequirementStatusBadge, RequirementPriorityBadge, SLAChip } from '@/components/requerimentos/RequirementBadges';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ClipboardList, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { slaInfo } from '@/lib/requirements';
import { toast } from '@/hooks/use-toast';

export default function FilaRequerimentos() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<RequirementFilters>({ status: 'all', priority: 'all', categoryId: 'all' });
  const { data: reqs = [], isLoading } = useRequirementsList({ scope: 'all', filters });
  const update = useUpdateRequirement();

  const kpis = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    return {
      open: reqs.filter((r: any) => r.status === 'open').length,
      inProgress: reqs.filter((r: any) => r.status === 'in_progress').length,
      overdue: reqs.filter((r: any) => r.due_date && new Date(r.due_date) < now && r.status !== 'completed' && r.status !== 'rejected').length,
      doneToday: reqs.filter((r: any) => r.completed_at && r.completed_at.slice(0, 10) === today).length,
    };
  }, [reqs]);

  const sorted = useMemo(() => {
    return [...reqs].sort((a: any, b: any) => {
      const ao = slaInfo(a.due_date, a.status).overdue ? 0 : 1;
      const bo = slaInfo(b.due_date, b.status).overdue ? 0 : 1;
      if (ao !== bo) return ao - bo;
      const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return ad - bd;
    });
  }, [reqs]);

  const assignToMe = async (id: string) => {
    if (!user) return;
    try { await update.mutateAsync({ id, patch: { assigned_to: user.id, status: 'in_progress' } }); toast({ title: 'Atribuído a você' }); }
    catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  const Kpi = ({ label, value, tone }: { label: string; value: number; tone?: string }) => (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${tone ?? ''}`}>{value}</div>
    </CardContent></Card>
  );

  return (
    <MainLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6 text-primary" />Fila de requerimentos</h1>
          <p className="text-muted-foreground text-sm">Atenda solicitações abertas por alunos.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Abertos" value={kpis.open} tone="text-blue-600" />
          <Kpi label="Em análise" value={kpis.inProgress} tone="text-amber-600" />
          <Kpi label="Atrasados" value={kpis.overdue} tone="text-rose-600" />
          <Kpi label="Concluídos hoje" value={kpis.doneToday} tone="text-emerald-600" />
        </div>

        <RequirementFiltersBar value={filters} onChange={setFilters} showAssignedFilter showOverdueFilter />

        <Card>
          <CardContent className="p-0">
            {isLoading ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> :
             sorted.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Nenhum requerimento encontrado.</p> :
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.protocol_number}</TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{r.student?.full_name ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">{r.student?.registration_number}</div>
                        </TableCell>
                        <TableCell className="text-sm max-w-[240px] truncate">{r.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.category?.name ?? '—'}</TableCell>
                        <TableCell><RequirementStatusBadge status={r.status} /></TableCell>
                        <TableCell><RequirementPriorityBadge priority={r.priority} /></TableCell>
                        <TableCell><SLAChip dueDate={r.due_date} status={r.status} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {r.assigned_to !== user?.id && r.status !== 'completed' && r.status !== 'rejected' && (
                              <Button size="sm" variant="outline" onClick={() => assignToMe(r.id)} disabled={update.isPending}>
                                {update.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Pegar'}
                              </Button>
                            )}
                            <Button size="sm" asChild><Link to={`/requerimentos/${r.id}`}>Abrir<ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            }
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
