import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { usePaymentSlips, useCancelSlip } from '@/hooks/useFinance';
import { useCanReadAcademic, useCanWriteAcademic } from '@/components/academico/StaffOnly';
import { PaymentSlipCard } from '@/components/financeiro/PaymentSlipCard';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FileText, Search, XCircle } from 'lucide-react';
import { SLIP_STATUS_LABEL } from '@/lib/finance';
import { toast } from '@/hooks/use-toast';

export default function Boletos() {
  const canRead = useCanReadAcademic();
  const canWrite = useCanWriteAcademic();
  const [filters, setFilters] = useState<any>({ search: '', status: 'all' });
  const { data: rows = [], isLoading } = usePaymentSlips(filters);
  const cancel = useCancelSlip();

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;
  const doCancel = async (id: string) => { try { await cancel.mutateAsync(id); toast({ title: 'Boleto cancelado' }); } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" />Boletos</h1>
          <p className="text-muted-foreground text-sm">Boletos emitidos e histórico.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar boleto / aluno" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="pl-8" />
          </div>
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos status</SelectItem>{Object.entries(SLIP_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {isLoading ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div> :
         rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Nenhum boleto encontrado.</p> :
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rows.map((s: any) => (
              <div key={s.id} className="relative">
                <PaymentSlipCard slip={s} showStudent />
                {canWrite && s.status === 'emitido' && (
                  <Button size="sm" variant="ghost" className="absolute top-2 right-2 text-rose-600" onClick={() => doCancel(s.id)}>
                    <XCircle className="h-4 w-4 mr-1" />Cancelar
                  </Button>
                )}
              </div>
            ))}
          </div>
        }
      </div>
    </MainLayout>
  );
}
