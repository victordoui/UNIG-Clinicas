import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useReservations, useCancelReservation, useRooms } from '@/hooks/useRooms';
import { ReservationCard } from '@/components/espacos/ReservationCard';
import { ReservationApprovalPanel } from '@/components/espacos/ReservationApprovalPanel';
import { ReservationFormDialog } from '@/components/espacos/ReservationFormDialog';
import { useCanReadAcademic } from '@/components/academico/StaffOnly';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Plus, Search } from 'lucide-react';
import { RESERVATION_STATUS_LABEL } from '@/lib/rooms';
import { toast } from '@/hooks/use-toast';

export default function Reservas() {
  const canRead = useCanReadAcademic();
  const [filters, setFilters] = useState<any>({ status: 'all', roomId: 'all', search: '' });
  const [selected, setSelected] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const { data: rows = [], isLoading } = useReservations({
    status: filters.status === 'all' ? undefined : filters.status,
    roomId: filters.roomId === 'all' ? undefined : filters.roomId,
    search: filters.search || undefined,
  });
  const { data: rooms = [] } = useRooms({});
  const cancel = useCancelReservation();

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;
  const doCancel = async (id: string) => { try { await cancel.mutateAsync(id); toast({ title: 'Cancelada' }); } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="h-6 w-6 text-primary" />Reservas</h1>
            <p className="text-muted-foreground text-sm">Todas as reservas do sistema.</p>
          </div>
          <ReservationFormDialog trigger={<Button><Plus className="h-4 w-4 mr-1" />Nova reserva</Button>} />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por título" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="pl-8" />
          </div>
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {Object.entries(RESERVATION_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.roomId} onValueChange={(v) => setFilters({ ...filters, roomId: v })}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas salas</SelectItem>
              {rooms.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.code} — {r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? <div className="grid md:grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div> :
         rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Nenhuma reserva encontrada.</p> :
         <div className="grid md:grid-cols-2 gap-3">
           {rows.map((r: any) => <ReservationCard key={r.id} reservation={r} onSelect={(x) => { setSelected(x); setOpen(true); }} onCancel={doCancel} />)}
         </div>}

        <ReservationApprovalPanel reservation={selected} open={open} onOpenChange={setOpen} />
      </div>
    </MainLayout>
  );
}
