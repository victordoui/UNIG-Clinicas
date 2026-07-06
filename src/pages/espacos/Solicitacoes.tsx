import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useReservations } from '@/hooks/useRooms';
import { ReservationCard } from '@/components/espacos/ReservationCard';
import { ReservationApprovalPanel } from '@/components/espacos/ReservationApprovalPanel';
import { useCanReadAcademic } from '@/components/academico/StaffOnly';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList } from 'lucide-react';

export default function Solicitacoes() {
  const canRead = useCanReadAcademic();
  const [selected, setSelected] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const { data: rows = [], isLoading } = useReservations({ status: 'solicitada' });

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6 text-primary" />Solicitações de Espaço</h1>
          <p className="text-muted-foreground text-sm">Analise e aprove pedidos de reserva de sala.</p>
        </div>

        {isLoading ? <div className="grid md:grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div> :
         rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Nenhuma solicitação pendente.</p> :
         <div className="grid md:grid-cols-2 gap-3">
           {rows.map((r: any) => <ReservationCard key={r.id} reservation={r} onSelect={(x) => { setSelected(x); setOpen(true); }} />)}
         </div>}

        <ReservationApprovalPanel reservation={selected} open={open} onOpenChange={setOpen} />
      </div>
    </MainLayout>
  );
}
