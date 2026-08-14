import { useMemo, useState } from 'react';
import { Building2, Map, Projector, Search, Sparkles, Users } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useRooms } from '@/hooks/useRooms';
import { useUnits } from '@/hooks/useAcademicData';
import { RoomCard } from '@/components/espacos/RoomCard';
import { useCanReadAcademic } from '@/components/academico/StaffOnly';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ROOM_TYPE_LABEL } from '@/lib/rooms';

export default function Mapa() {
  const canRead = useCanReadAcademic();
  const [unitId, setUnitId] = useState('all');
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [minimumCapacity, setMinimumCapacity] = useState('');
  const [projectorOnly, setProjectorOnly] = useState(false);
  const { data: rooms = [], isLoading } = useRooms({ unitId, roomType: type, search });
  const { data: units = [] } = useUnits();
  const filteredRooms = useMemo(() => rooms.filter((room: any) => (!minimumCapacity || room.capacity >= Number(minimumCapacity)) && (!projectorOnly || room.has_projector)), [minimumCapacity, projectorOnly, rooms]);
  const grouped = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = {};
    filteredRooms.forEach((room: any) => {
      const unit = room.unit?.name ?? 'Sem unidade';
      const block = room.block ? `Bloco ${room.block}` : 'Sem bloco';
      (groups[unit] ??= {})[block] ??= [];
      groups[unit][block].push(room);
    });
    return groups;
  }, [filteredRooms]);
  const capacity = filteredRooms.reduce((sum: number, room: any) => sum + (room.capacity ?? 0), 0);
  const premium = filteredRooms.filter((room: any) => ['premium', 'semi_premium'].includes(room.quality_tier)).length;
  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;

  return <MainLayout><div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><Map className="h-6 w-6 text-primary" />Mapa de Espaços</h1><p className="mt-1 text-sm text-muted-foreground">Consulta operacional por unidade, bloco, capacidade e recursos.</p></div><div className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">Inventário integrado</div></div>
    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={Building2} label="Espaços encontrados" value={isLoading ? '—' : filteredRooms.length} /><Metric icon={Users} label="Capacidade disponível" value={isLoading ? '—' : capacity.toLocaleString('pt-BR')} /><Metric icon={Sparkles} label="Premium e Semi Premium" value={isLoading ? '—' : premium} /></div>
    <Card className="border-primary/15 shadow-sm"><CardContent className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-5"><div className="space-y-1.5"><Label>Unidade</Label><Select value={unitId} onValueChange={setUnitId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas unidades</SelectItem>{units.map((unit: any) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Tipo de ambiente</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem>{Object.entries(ROOM_TYPE_LABEL).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label htmlFor="search-room">Buscar</Label><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="search-room" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Sala, bloco ou código" className="pl-9" /></div></div><div className="space-y-1.5"><Label htmlFor="minimum-capacity">Capacidade mínima</Label><Input id="minimum-capacity" type="number" min="0" value={minimumCapacity} onChange={(event) => setMinimumCapacity(event.target.value)} placeholder="Ex.: 60" /></div><label className="flex items-end gap-2 pb-2 text-sm font-medium"><Switch checked={projectorOnly} onCheckedChange={setProjectorOnly} /><Projector className="h-4 w-4 text-primary" />Com projetor</label></CardContent></Card>
    {isLoading ? <div className="grid gap-3 md:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-40" />)}</div> : Object.keys(grouped).length === 0 ? <Card className="border-dashed"><CardContent className="py-16 text-center"><Map className="mx-auto h-10 w-10 text-muted-foreground/50" /><h2 className="mt-4 font-semibold">Nenhum espaço corresponde aos filtros</h2><p className="mt-1 text-sm text-muted-foreground">Ajuste a unidade, tipo ou capacidade para ampliar a busca.</p></CardContent></Card> : Object.entries(grouped).map(([unit, blocks]) => <section key={unit} className="space-y-4"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-4 w-4" /></span><h2 className="text-lg font-semibold">{unit}</h2></div>{Object.entries(blocks).map(([block, list]) => <div key={block} className="rounded-xl border bg-muted/20 p-3 md:p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">{block}</h3><span className="text-xs text-muted-foreground">{list.length} ambiente{list.length !== 1 ? 's' : ''}</span></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map((room: any) => <RoomCard key={room.id} room={room} compact />)}</div></div>)}</section>)}</div></MainLayout>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string | number }) { return <Card><CardContent className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-2xl font-semibold tracking-tight">{value}</p></div></CardContent></Card>; }
