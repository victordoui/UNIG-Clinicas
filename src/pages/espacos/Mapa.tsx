import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useRooms } from '@/hooks/useRooms';
import { useUnits } from '@/hooks/useAcademicData';
import { RoomCard } from '@/components/espacos/RoomCard';
import { ReservationFormDialog } from '@/components/espacos/ReservationFormDialog';
import { useCanReadAcademic } from '@/components/academico/StaffOnly';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Map } from 'lucide-react';

export default function Mapa() {
  const canRead = useCanReadAcademic();
  const [unitId, setUnitId] = useState('all');
  const { data: rooms = [], isLoading } = useRooms({ unitId });
  const { data: units = [] } = useUnits();

  const grouped = useMemo(() => {
    const g: Record<string, Record<string, any[]>> = {};
    rooms.forEach((r: any) => {
      const unit = r.unit?.name ?? 'Sem unidade';
      const block = r.block ? `Bloco ${r.block}` : 'Sem bloco';
      g[unit] = g[unit] ?? {};
      g[unit][block] = g[unit][block] ?? [];
      g[unit][block].push(r);
    });
    return g;
  }, [rooms]);

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Map className="h-6 w-6 text-primary" />Mapa de Salas</h1>
            <p className="text-muted-foreground text-sm">Visualização agrupada por unidade e bloco.</p>
          </div>
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas unidades</SelectItem>{units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {isLoading ? <div className="grid md:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div> :
         Object.keys(grouped).length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Nenhuma sala encontrada.</p> :
          Object.entries(grouped).map(([unit, blocks]) => (
            <section key={unit} className="space-y-3">
              <h2 className="font-semibold flex items-center gap-2 text-lg"><Building2 className="h-4 w-4 text-primary" />{unit}</h2>
              {Object.entries(blocks).map(([block, list]) => (
                <div key={block} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">{block}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {list.map((r: any) => <RoomCard key={r.id} room={r} compact />)}
                  </div>
                </div>
              ))}
            </section>
          ))
        }
      </div>
    </MainLayout>
  );
}
