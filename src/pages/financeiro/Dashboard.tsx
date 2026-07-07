import { MainLayout } from '@/components/layout/MainLayout';
import { FinanceKpiRow } from '@/components/financeiro/FinanceKpiRow';
import { ChargeListTable } from '@/components/financeiro/ChargeListTable';
import { useFinanceSummary, useTuitionCharges, useDeleteCharge } from '@/hooks/useFinance';
import { useCanReadAcademic, useCanWriteAcademic } from '@/components/academico/StaffOnly';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function FinanceiroDashboard() {
  const canRead = useCanReadAcademic();
  const canWrite = useCanWriteAcademic();
  const { data: summary, isLoading } = useFinanceSummary();
  const { data: pending = [] } = useTuitionCharges({ status: 'pendente' });
  const del = useDeleteCharge();

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = pending
    .filter((c: any) => c.due_date >= today)
    .sort((a: any, b: any) => a.due_date.localeCompare(b.due_date))
    .slice(0, 8);
  const overdue = pending.filter((c: any) => c.due_date < today).slice(0, 8);

  const remove = async (id: string) => { try { await del.mutateAsync(id); toast({ title: 'Removido' }); } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" />Financeiro</h1>
          <p className="text-muted-foreground text-sm">Visão geral da tesouraria.</p>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-primary via-primary/95 to-primary/80 p-4">
          {isLoading ? <Skeleton className="h-20" /> : <FinanceKpiRow summary={summary} />}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Próximas cobranças a vencer</CardTitle></CardHeader>
            <CardContent><ChargeListTable rows={upcoming} canWrite={canWrite} onDelete={remove} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base text-rose-600">Inadimplentes recentes</CardTitle></CardHeader>
            <CardContent><ChargeListTable rows={overdue} canWrite={canWrite} onDelete={remove} /></CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
