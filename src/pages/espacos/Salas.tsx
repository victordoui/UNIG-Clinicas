import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useRooms, useDeleteRoom } from '@/hooks/useRooms';
import { useUnits } from '@/hooks/useAcademicData';
import { RoomFormDialog } from '@/components/espacos/RoomFormDialog';
import { RoomCard } from '@/components/espacos/RoomCard';
import { useCanReadAcademic, useCanWriteAcademic } from '@/components/academico/StaffOnly';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPinned, Plus, Search } from 'lucide-react';
import { ROOM_TYPE_LABEL, ROOM_STATUS_LABEL } from '@/lib/rooms';
import { toast } from '@/hooks/use-toast';

export default function Salas() {
  const canRead = useCanReadAcademic();
  const canWrite = useCanWriteAcademic();
  const [filters, setFilters] = useState<any>({ search: '', unitId: 'all', status: 'all', roomType: 'all' });
  const { data: rooms = [], isLoading } = useRooms(filters);
  const { data: units = [] } = useUnits();
  const del = useDeleteRoom();

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;
  const remove = async (id: string) => { try { await del.mutateAsync(id); toast({ title: 'Removido' }); } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><MapPinned className="h-6 w-6 text-primary" />Salas</h1>
            <p className="text-muted-foreground text-sm">Cadastro e status das salas físicas.</p>
          </div>
          {canWrite && <RoomFormDialog trigger={<Button><Plus className="h-4 w-4 mr-1" />Nova sala</Button>} />}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar sala" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="pl-8" />
          </div>
          <Select value={filters.unitId} onValueChange={(v) => setFilters({ ...filters, unitId: v })}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas unidades</SelectItem>{units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.roomType} onValueChange={(v) => setFilters({ ...filters, roomType: v })}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos tipos</SelectItem>{Object.entries(ROOM_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos status</SelectItem>{Object.entries(ROOM_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {isLoading ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}</div> :
         rooms.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Nenhuma sala encontrada.</p> :
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rooms.map((r: any) => (
              <RoomCard key={r.id} room={r} canWrite={canWrite} onDelete={remove} />
            ))}
          </div>
        }
      </div>
    </MainLayout>
  );
}
