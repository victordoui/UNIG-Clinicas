import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useMyReservations, useCancelReservation } from '@/hooks/useRooms';
import { ReservationFormDialog } from '@/components/espacos/ReservationFormDialog';
import { ReservationCard } from '@/components/espacos/ReservationCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Solicitar() {
  const { user } = useAuth();
  const { data: rows = [], isLoading } = useMyReservations(user?.id);
  const cancel = useCancelReservation();

  const doCancel = async (id: string) => { try { await cancel.mutateAsync(id); toast({ title: 'Cancelada' }); } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" />Solicitar Espaço</h1>
            <p className="text-muted-foreground text-sm">Solicite reserva de uma sala e acompanhe suas solicitações.</p>
          </div>
          <ReservationFormDialog trigger={<Button><Plus className="h-4 w-4 mr-1" />Nova solicitação</Button>} />
        </div>

        <h2 className="font-semibold text-sm">Minhas solicitações</h2>
        {isLoading ? <div className="grid md:grid-cols-2 gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div> :
         rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Você ainda não fez solicitações.</p> :
         <div className="grid md:grid-cols-2 gap-3">
           {rows.map((r: any) => <ReservationCard key={r.id} reservation={r} onCancel={doCancel} />)}
         </div>}
      </div>
    </MainLayout>
  );
}
