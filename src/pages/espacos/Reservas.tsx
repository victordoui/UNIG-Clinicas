import { useState } from 'react';
import { CalendarDays, CirclePlus, Plus, Search } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useReservations, useCancelReservation, useRooms } from '@/hooks/useRooms';
import { ReservationCard } from '@/components/espacos/ReservationCard';
import { ReservationApprovalPanel } from '@/components/espacos/ReservationApprovalPanel';
import { ReservationFormDialog } from '@/components/espacos/ReservationFormDialog';
import { useCanReadAcademic } from '@/components/academico/StaffOnly';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RESERVATION_STATUS_LABEL } from '@/lib/rooms';
import { toast } from '@/hooks/use-toast';

export default function Reservas() {
  const canRead = useCanReadAcademic(); const [filters, setFilters] = useState<any>({ status: 'all', roomId: 'all', search: '' }); const [selected, setSelected] = useState<any>(null); const [open, setOpen] = useState(false);
  const { data: rows = [], isLoading } = useReservations({ status: filters.status === 'all' ? undefined : filters.status, roomId: filters.roomId === 'all' ? undefined : filters.roomId, search: filters.search || undefined });
  const { data: rooms = [] } = useRooms({}); const cancel = useCancelReservation();
  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;
  const doCancel = async (id: string) => { try { await cancel.mutateAsync(id); toast({ title: 'Reserva cancelada' }); } catch (error: any) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); } };
  return <MainLayout><div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarDays className="h-6 w-6 text-primary" />Reservas</h1><p className="mt-1 text-sm text-muted-foreground">Acompanhe solicitações, aprovações e agenda dos ambientes.</p></div><ReservationFormDialog trigger={<Button className="shadow-sm"><Plus className="mr-1 h-4 w-4" />Nova reserva</Button>} /></div><Card className="border-primary/15"><CardContent className="flex flex-wrap gap-2 p-3"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar por título" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} className="pl-8" /></div><Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem>{Object.entries(RESERVATION_STATUS_LABEL).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select><Select value={filters.roomId} onValueChange={(value) => setFilters({ ...filters, roomId: value })}><SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as salas</SelectItem>{rooms.map((room: any) => <SelectItem key={room.id} value={room.id}>{room.code} — {room.name}</SelectItem>)}</SelectContent></Select></CardContent></Card>{isLoading ? <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32" />)}</div> : rows.length === 0 ? <Card className="border-dashed"><CardContent className="py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CirclePlus className="h-6 w-6" /></span><h2 className="mt-4 text-lg font-semibold">Ainda não há reservas para este filtro</h2><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Crie uma reserva para organizar aulas, avaliações, eventos e outros usos dos espaços.</p><div className="mt-5"><ReservationFormDialog trigger={<Button><Plus className="mr-1 h-4 w-4" />Criar primeira reserva</Button>} /></div></CardContent></Card> : <div className="grid gap-3 md:grid-cols-2">{rows.map((row: any) => <ReservationCard key={row.id} reservation={row} onSelect={(reservation) => { setSelected(reservation); setOpen(true); }} onCancel={doCancel} />)}</div>}<ReservationApprovalPanel reservation={selected} open={open} onOpenChange={setOpen} /></div></MainLayout>;
}
