import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useRooms, useReservations, useCancelReservation } from '@/hooks/useRooms';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPinned, CalendarDays, ClipboardList, CheckCircle2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ReservationCard } from '@/components/espacos/ReservationCard';
import { ReservationFormDialog } from '@/components/espacos/ReservationFormDialog';
import { toast } from '@/hooks/use-toast';

export default function EspacosDashboard() {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const tomorrow = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + 7); return d; }, [today]);
  const { data: rooms = [] } = useRooms({});
  const { data: pending = [] } = useReservations({ status: 'solicitada' });
  const { data: upcoming = [], isLoading } = useReservations({
    status: 'aprovada',
    from: today.toISOString(),
    to: tomorrow.toISOString(),
  });
  const cancel = useCancelReservation();

  const activeRooms = rooms.filter((r: any) => r.status !== 'inativa').length;
  const todayCount = upcoming.filter((r: any) => new Date(r.start_datetime).toDateString() === today.toDateString()).length;

  const doCancel = async (id: string) => { try { await cancel.mutateAsync(id); toast({ title: 'Reserva cancelada' }); } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><MapPinned className="h-6 w-6 text-primary" />Espaços</h1>
            <p className="text-muted-foreground text-sm">Visão consolidada de salas, reservas e ocupação.</p>
          </div>
          <div className="flex gap-2">
            <ReservationFormDialog trigger={<Button><Plus className="h-4 w-4 mr-1" />Nova reserva</Button>} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Salas ativas" value={activeRooms} icon={MapPinned} to="/espacos/salas" />
          <KpiCard label="Reservas hoje" value={todayCount} icon={CalendarDays} to="/espacos/reservas" />
          <KpiCard label="Solicitações pendentes" value={pending.length} icon={ClipboardList} to="/espacos/solicitacoes" />
          <KpiCard label="Próximos 7 dias" value={upcoming.length} icon={CheckCircle2} to="/espacos/reservas" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Próximas reservas (7 dias)</h2>
            <Button variant="link" size="sm" asChild><Link to="/espacos/reservas">Ver todas</Link></Button>
          </div>
          {isLoading ? <div className="grid md:grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div> :
           upcoming.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem reservas nos próximos 7 dias.</p> :
           <div className="grid md:grid-cols-2 gap-3">
             {upcoming.slice(0, 6).map((r: any) => <ReservationCard key={r.id} reservation={r} onCancel={doCancel} />)}
           </div>}
        </div>
      </div>
    </MainLayout>
  );
}

function KpiCard({ label, value, icon: Icon, to }: { label: string; value: number; icon: any; to?: string }) {
  const body = (
    <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-5 w-5" /></div>
      <div className="min-w-0"><div className="text-2xl font-semibold leading-none">{value}</div><div className="text-xs text-muted-foreground mt-1">{label}</div></div>
    </CardContent></Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}
