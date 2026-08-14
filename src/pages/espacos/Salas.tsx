import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useRooms, useDeleteRoom, type RoomFilters } from '@/hooks/useRooms';
import { useUnits } from '@/hooks/useAcademicData';
import { RoomFormDialog } from '@/components/espacos/RoomFormDialog';
import { RoomCard } from '@/components/espacos/RoomCard';
import { useCanReadAcademic, useCanWriteAcademic } from '@/components/academico/StaffOnly';
import { IconSelect, type IconSelectOption } from '@/components/ui/icon-select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Ban,
  BookOpen,
  Building2,
  CheckCircle2,
  CircleDot,
  DoorOpen,
  FlaskConical,
  LayoutGrid,
  MapPinned,
  Mic,
  Monitor,
  PanelsTopLeft,
  Plus,
  Presentation,
  Projector,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trophy,
  Tv,
  Users,
  UsersRound,
  Wind,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { ROOM_TYPE_LABEL, ROOM_STATUS_LABEL } from '@/lib/rooms';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const INITIAL_FILTERS: RoomFilters = {
  search: '',
  unitId: 'all',
  status: 'all',
  roomType: 'all',
  qualityTier: 'all',
  minCapacity: undefined,
};

const TYPE_ICONS: Record<string, LucideIcon> = {
  sala_aula: DoorOpen,
  laboratorio: FlaskConical,
  auditorio: Presentation,
  biblioteca: BookOpen,
  sala_reuniao: UsersRound,
  quadra: Trophy,
  sala_metodologia: LayoutGrid,
  sala_especial: Sparkles,
  outro: CircleDot,
};

const STATUS_ICONS: Record<string, LucideIcon> = {
  disponivel: CheckCircle2,
  manutencao: Wrench,
  reservada: Users,
  inativa: Ban,
};

function ResourceFilterButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'h-9 rounded-full border-border bg-background px-3 font-medium',
        active && 'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
      )}
    >
      <Icon className="mr-1.5 h-4 w-4" />
      {label}
    </Button>
  );
}

export default function Salas() {
  const canRead = useCanReadAcademic();
  const canWrite = useCanWriteAcademic();
  const [filters, setFilters] = useState<RoomFilters>(INITIAL_FILTERS);
  const [visibleCount, setVisibleCount] = useState(18);
  const { data: rooms = [], isLoading } = useRooms(filters);
  const { data: units = [] } = useUnits();
  const del = useDeleteRoom();

  const unitOptions = useMemo<IconSelectOption[]>(() => [
    { value: 'all', label: 'Todas as unidades', icon: Building2, iconClassName: 'text-sky-600' },
    ...units.map((unit: any) => ({ value: unit.id, label: unit.name, icon: Building2, iconClassName: 'text-sky-600' })),
  ], [units]);

  const typeOptions = useMemo<IconSelectOption[]>(() => [
    { value: 'all', label: 'Todos os tipos', icon: DoorOpen, iconClassName: 'text-violet-600' },
    ...Object.entries(ROOM_TYPE_LABEL).map(([value, label]) => ({
      value,
      label,
      icon: TYPE_ICONS[value] ?? DoorOpen,
      iconClassName: 'text-violet-600',
    })),
  ], []);

  const statusOptions = useMemo<IconSelectOption[]>(() => [
    { value: 'all', label: 'Todos os status', icon: CircleDot, iconClassName: 'text-emerald-600' },
    ...Object.entries(ROOM_STATUS_LABEL).map(([value, label]) => ({
      value,
      label,
      icon: STATUS_ICONS[value] ?? CircleDot,
      iconClassName: value === 'disponivel' ? 'text-emerald-600' : value === 'manutencao' ? 'text-amber-600' : 'text-slate-500',
    })),
  ], []);

  const qualityOptions: IconSelectOption[] = [
    { value: 'all', label: 'Todos os padrões', icon: Star, iconClassName: 'text-amber-500' },
    { value: 'padrao', label: 'Padrão', icon: Star, iconClassName: 'text-slate-500' },
    { value: 'semi_premium', label: 'Semi Premium', icon: Star, iconClassName: 'text-sky-600' },
    { value: 'premium', label: 'Premium', icon: Sparkles, iconClassName: 'text-amber-500' },
  ];

  const activeFilterCount = [
    filters.unitId !== 'all', filters.status !== 'all', filters.roomType !== 'all', filters.qualityTier !== 'all',
    Boolean(filters.minCapacity), filters.hasProjector, filters.hasAirConditioning, filters.hasComputer,
    filters.hasAudioSystem, filters.hasTv, filters.hasWhiteboard, filters.hasInteractiveScreen,
  ].filter(Boolean).length;

  const setFilter = <K extends keyof RoomFilters>(key: K, value: RoomFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => setVisibleCount(18), [filters]);

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;

  const remove = async (id: string) => {
    try {
      await del.mutateAsync(id);
      toast({ title: 'Sala removida' });
    } catch (error: any) {
      toast({ title: 'Não foi possível remover', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold"><MapPinned className="h-6 w-6 text-primary" />Salas</h1>
            <p className="text-sm text-muted-foreground">Encontre o espaço ideal por capacidade, estrutura e disponibilidade.</p>
          </div>
          {canWrite && <RoomFormDialog trigger={<Button><Plus className="mr-1 h-4 w-4" />Nova sala</Button>} />}
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardContent className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_210px_190px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Buscar sala"
                  placeholder="Buscar por nome ou código"
                  value={filters.search ?? ''}
                  onChange={(event) => setFilter('search', event.target.value)}
                  className="pl-9"
                />
              </div>
              <IconSelect value={filters.unitId ?? 'all'} onValueChange={(value) => setFilter('unitId', value)} options={unitOptions} aria-label="Filtrar unidade" />
              <IconSelect value={filters.roomType ?? 'all'} onValueChange={(value) => setFilter('roomType', value)} options={typeOptions} aria-label="Filtrar tipo de sala" />
              <IconSelect value={filters.status ?? 'all'} onValueChange={(value) => setFilter('status', value)} options={statusOptions} aria-label="Filtrar status" />
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Estrutura da sala
                  {activeFilterCount > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{activeFilterCount} ativos</span>}
                </div>
                {activeFilterCount > 0 && (
                  <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setFilters(INITIAL_FILTERS)}>
                    <X className="mr-1 h-4 w-4" />Limpar filtros
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-44">
                  <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    aria-label="Capacidade mínima"
                    placeholder="Mín. de lugares"
                    value={filters.minCapacity ?? ''}
                    onChange={(event) => setFilter('minCapacity', event.target.value ? Number(event.target.value) : undefined)}
                    className="h-9 pl-9"
                  />
                </div>
                <IconSelect value={filters.qualityTier ?? 'all'} onValueChange={(value) => setFilter('qualityTier', value)} options={qualityOptions} className="h-9 w-full sm:w-48" aria-label="Filtrar padrão da sala" />
                <ResourceFilterButton active={!!filters.hasProjector} icon={Projector} label="Projetor" onClick={() => setFilter('hasProjector', !filters.hasProjector)} />
                <ResourceFilterButton active={!!filters.hasAirConditioning} icon={Wind} label="Ar-condicionado" onClick={() => setFilter('hasAirConditioning', !filters.hasAirConditioning)} />
                <ResourceFilterButton active={!!filters.hasComputer} icon={Monitor} label="Computador" onClick={() => setFilter('hasComputer', !filters.hasComputer)} />
                <ResourceFilterButton active={!!filters.hasAudioSystem} icon={Mic} label="Áudio" onClick={() => setFilter('hasAudioSystem', !filters.hasAudioSystem)} />
                <ResourceFilterButton active={!!filters.hasTv} icon={Tv} label="TV" onClick={() => setFilter('hasTv', !filters.hasTv)} />
                <ResourceFilterButton active={!!filters.hasWhiteboard} icon={Presentation} label="Quadro" onClick={() => setFilter('hasWhiteboard', !filters.hasWhiteboard)} />
                <ResourceFilterButton active={!!filters.hasInteractiveScreen} icon={PanelsTopLeft} label="Tela interativa" onClick={() => setFilter('hasInteractiveScreen', !filters.hasInteractiveScreen)} />
              </div>
            </div>

            <p className="text-xs text-muted-foreground" aria-live="polite">
              {isLoading ? 'Buscando salas…' : `${rooms.length} ${rooms.length === 1 ? 'sala encontrada' : 'salas encontradas'}${rooms.length > visibleCount ? ` · exibindo ${visibleCount}` : ''}`}
            </p>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-52 w-full" />)}</div>
        ) : rooms.length === 0 ? (
          <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12 text-center"><MapPinned className="mb-3 h-9 w-9 text-muted-foreground/60" /><p className="font-medium">Nenhuma sala corresponde aos filtros</p><p className="mt-1 text-sm text-muted-foreground">Remova um filtro ou tente outra busca.</p></CardContent></Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {rooms.slice(0, visibleCount).map((room: any) => <RoomCard key={room.id} room={room} canWrite={canWrite} onDelete={remove} />)}
            </div>
            {visibleCount < rooms.length && <div className="flex justify-center pt-2"><Button type="button" variant="outline" onClick={() => setVisibleCount((count) => count + 18)}>Mostrar mais salas</Button></div>}
          </>
        )}
      </div>
    </MainLayout>
  );
}
