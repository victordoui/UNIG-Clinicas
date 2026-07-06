import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { Building2, CalendarDays, Clock3, Filter, MapPin, Search, UserRound, Users, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { CardSkeleton } from '@/components/ui/table-skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useAdvanceCIPurchaseStage, usePromoteCIToPurchase } from '@/hooks/useCI';
import { usePurchaseCIKanban } from '@/hooks/usePurchaseCIKanban';
import { useToast } from '@/hooks/use-toast';
import { CI_PRIORITY_BADGE, CI_PRIORITY_LABEL, CI_STATUS_BADGE, CI_STATUS_LABEL } from '@/lib/ciLabels';
import {
  PURCHASE_OPERATIONAL_STAGES,
  canMovePurchaseCI,
  getPurchaseOperationalStage,
  type PurchaseCIKanbanCard,
  type PurchaseKanbanPeriod,
  type PurchaseKanbanView,
  type PurchaseOperationalStage,
} from '@/lib/purchaseCIKanban';
import { cn } from '@/lib/utils';

const MANAGER_ROLES = new Set(['super_admin', 'administrador', 'coordenador_operacoes', 'gerente_geral']);

interface FilterState {
  search: string;
  buyerId: string;
  requester: string;
  priority: string;
  campus: string;
  costCenterId: string;
  requestType: string;
  period: PurchaseKanbanPeriod;
  stage: PurchaseOperationalStage | 'all';
  includeClosed: boolean;
}

const EMPTY_FILTERS: FilterState = {
  search: '', buyerId: '', requester: '', priority: '', campus: '', costCenterId: '',
  requestType: '', period: 'all', stage: 'all', includeClosed: false,
};

function ageLabel(createdAt: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000));
  return days === 0 ? 'Hoje' : `${days}d em andamento`;
}

function KanbanCard({ card, canDrag, onOpen }: { card: PurchaseCIKanbanCard; canDrag: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id, disabled: !canDrag });
  return (
    <Card
      ref={setNodeRef}
      {...(canDrag ? listeners : {})}
      {...attributes}
      onClick={onOpen}
      className={cn('space-y-2 border-l-4 border-l-primary bg-card p-3 transition-shadow hover:shadow-md', canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer', isDragging && 'opacity-40')}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-primary">{card.protocol}</span>
        <Badge variant="outline" className={cn('px-1.5 py-0 text-[10px]', CI_PRIORITY_BADGE[card.priority as keyof typeof CI_PRIORITY_BADGE])}>
          {CI_PRIORITY_LABEL[card.priority as keyof typeof CI_PRIORITY_LABEL] ?? card.priority}
        </Badge>
      </div>
      <p className="line-clamp-2 text-sm font-medium leading-snug">{card.subject}</p>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{card.requester_name}</div>
        <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{card.buyer_name ?? 'Sem comprador'}</div>
        {(card.cost_center_name || card.campus) && <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{card.cost_center_name ?? card.campus}</div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Badge variant="outline" className={cn('text-[10px]', CI_STATUS_BADGE[card.status as keyof typeof CI_STATUS_BADGE])}>
          {CI_STATUS_LABEL[card.status as keyof typeof CI_STATUS_LABEL] ?? card.status}
        </Badge>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="h-3 w-3" />{ageLabel(card.created_at)}</span>
      </div>
    </Card>
  );
}

function KanbanColumn({ stage, cards, canDrag, onOpen }: { stage: PurchaseOperationalStage; cards: PurchaseCIKanbanCard[]; canDrag: (card: PurchaseCIKanbanCard) => boolean; onOpen: (card: PurchaseCIKanbanCard) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const label = PURCHASE_OPERATIONAL_STAGES.find((item) => item.value === stage)?.label ?? stage;
  return (
    <section className="w-[285px] shrink-0">
      <header className="mb-2 flex items-center justify-between px-1"><h3 className="text-xs font-semibold uppercase text-muted-foreground">{label}</h3><Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-[10px]">{cards.length}</Badge></header>
      <div ref={setNodeRef} className={cn('min-h-[240px] space-y-2 rounded-md bg-muted/40 p-2 transition-colors', isOver && 'bg-primary/10 ring-2 ring-primary/30')}>
        {cards.map((card) => <KanbanCard key={card.id} card={card} canDrag={canDrag(card)} onOpen={() => onOpen(card)} />)}
        {cards.length === 0 && <p className="px-2 py-8 text-center text-xs text-muted-foreground">Nenhuma CI nesta etapa</p>}
      </div>
    </section>
  );
}

export function PurchaseCIKanban() {
  const { user, unigRole, isSuperAdmin } = useAuth();
  const isManager = isSuperAdmin || MANAGER_ROLES.has(unigRole);
  const defaultView: PurchaseKanbanView = unigRole === 'compras' ? 'mine' : 'team';
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...EMPTY_FILTERS,
    search: searchParams.get('search') ?? '', buyerId: searchParams.get('buyer') ?? '',
    priority: searchParams.get('priority') ?? '', campus: searchParams.get('campus') ?? '',
    costCenterId: searchParams.get('costCenter') ?? '', requestType: searchParams.get('type') ?? '',
    period: (searchParams.get('period') as PurchaseKanbanPeriod) || 'all',
    stage: (searchParams.get('stage') as PurchaseOperationalStage) || 'all', includeClosed: searchParams.get('closed') === 'true',
  }));
  const view = (searchParams.get('view') as PurchaseKanbanView) || defaultView;
  const promote = usePromoteCIToPurchase();
  const advanceStage = useAdvanceCIPurchaseStage();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const queryFilters = useMemo(() => ({
    ...filters, view, userId: user?.id,
    buyerId: filters.buyerId || undefined, requester: filters.requester || undefined,
    priority: filters.priority || undefined, campus: filters.campus || undefined,
    costCenterId: filters.costCenterId || undefined, requestType: filters.requestType || undefined,
  }), [filters, user?.id, view]);
  const { cards, buyers, costCenters, campuses, requestTypes, isLoading } = usePurchaseCIKanban(queryFilters);
  const stages = useMemo(
    () => filters.stage === 'all' ? PURCHASE_OPERATIONAL_STAGES.map((item) => item.value) : [filters.stage],
    [filters.stage],
  );
  const grouped = useMemo(() => new Map(stages.map((stage) => [stage, cards.filter((card) => getPurchaseOperationalStage(card) === stage)])), [cards, stages]);
  const activeCard = cards.find((card) => card.id === activeId) ?? null;
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => key !== 'search' && (key === 'period' || key === 'stage' ? value !== 'all' : value !== '' && value !== false)).length;

  function updateUrl(nextView: PurchaseKanbanView, nextFilters = filters) {
    const next = new URLSearchParams();
    next.set('view', nextView);
    if (nextFilters.search) next.set('search', nextFilters.search);
    if (nextFilters.buyerId) next.set('buyer', nextFilters.buyerId);
    if (nextFilters.priority) next.set('priority', nextFilters.priority);
    if (nextFilters.campus) next.set('campus', nextFilters.campus);
    if (nextFilters.costCenterId) next.set('costCenter', nextFilters.costCenterId);
    if (nextFilters.requestType) next.set('type', nextFilters.requestType);
    if (nextFilters.period !== 'all') next.set('period', nextFilters.period);
    if (nextFilters.stage !== 'all') next.set('stage', nextFilters.stage);
    if (nextFilters.includeClosed) next.set('closed', 'true');
    setSearchParams(next, { replace: true });
  }

  function setFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    updateUrl(view, next);
  }

  function canDrag(card: PurchaseCIKanbanCard) {
    const stage = getPurchaseOperationalStage(card);
    const target = stage === 'buyer_queue' ? 'quoting' : 'delivery';
    return canMovePurchaseCI(card, stage, target, user?.id, isManager);
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const card = cards.find((item) => item.id === String(event.active.id));
    const target = event.over?.id as PurchaseOperationalStage | undefined;
    if (!card || !target) return;
    const from = getPurchaseOperationalStage(card);
    if (from === target) return;
    if (!canMovePurchaseCI(card, from, target, user?.id, isManager)) {
      toast({ title: 'Movimento não permitido', description: 'Esta etapa exige uma ação no detalhe da CI.', variant: 'destructive' });
      return;
    }
    if (from === 'buyer_queue' && target === 'quoting') await promote.mutateAsync(card.id);
    if (from === 'ordered' && target === 'delivery') {
      await advanceStage.mutateAsync({ id: card.id, status: 'aguardando_entrega' });
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <CardSkeleton />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={(event) => setActiveId(String(event.active.id))} onDragEnd={onDragEnd}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {([['mine', 'Minhas CIs', UserRound], ['team', 'Visão da equipe', Users], ['unassigned', 'Sem comprador', X]] as const).map(([value, label, Icon]) => (
              <Button key={value} size="sm" variant={view === value ? 'default' : 'outline'} onClick={() => updateUrl(value)}><Icon className="mr-1.5 h-4 w-4" />{label}</Button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={filters.search} onChange={(event) => setFilter('search', event.target.value)} placeholder="Buscar protocolo, assunto ou solicitante" className="pl-9" /></div>
            <Sheet>
              <SheetTrigger asChild><Button variant="outline"><Filter className="mr-1.5 h-4 w-4" />Filtros{activeFilterCount > 0 && <Badge className="ml-2 h-5 min-w-5 px-1">{activeFilterCount}</Badge>}</Button></SheetTrigger>
              <SheetContent className="w-full overflow-y-auto sm:max-w-md">
                <SheetHeader><SheetTitle>Filtros do Kanban</SheetTitle><SheetDescription>Refine a visão sem alterar os dados das CIs.</SheetDescription></SheetHeader>
                <div className="mt-6 space-y-4">
                  <FilterSelect label="Comprador" value={filters.buyerId || 'all'} onChange={(value) => setFilter('buyerId', value === 'all' ? '' : value)} options={buyers.filter((buyer) => buyer.role === 'compras').map((buyer) => ({ value: buyer.user_id, label: buyer.full_name || buyer.email || 'Comprador' }))} />
                  <div className="space-y-1.5"><Label>Solicitante</Label><Input value={filters.requester} onChange={(event) => setFilter('requester', event.target.value)} placeholder="Nome do solicitante" /></div>
                  <FilterSelect label="Prioridade" value={filters.priority || 'all'} onChange={(value) => setFilter('priority', value === 'all' ? '' : value)} options={[{ value: 'baixa', label: 'Baixa' }, { value: 'media', label: 'Média' }, { value: 'alta', label: 'Alta' }, { value: 'urgente', label: 'Urgente' }]} />
                  <FilterSelect label="Tipo de pedido" value={filters.requestType || 'all'} onChange={(value) => setFilter('requestType', value === 'all' ? '' : value)} options={requestTypes.map((value) => ({ value, label: value }))} />
                  <FilterSelect label="Campus" value={filters.campus || 'all'} onChange={(value) => setFilter('campus', value === 'all' ? '' : value)} options={campuses.map((value) => ({ value, label: value }))} />
                  <FilterSelect label="Centro de custo" value={filters.costCenterId || 'all'} onChange={(value) => setFilter('costCenterId', value === 'all' ? '' : value)} options={costCenters.map((cc) => ({ value: cc.id, label: `${cc.codigo} - ${cc.nome}` }))} />
                  <FilterSelect label="Período" value={filters.period} onChange={(value) => setFilter('period', value as PurchaseKanbanPeriod)} options={[{ value: 'day', label: 'Hoje' }, { value: 'week', label: 'Últimos 7 dias' }, { value: 'month', label: 'Últimos 30 dias' }]} />
                  <FilterSelect label="Etapa" value={filters.stage} onChange={(value) => setFilter('stage', value as PurchaseOperationalStage | 'all')} options={PURCHASE_OPERATIONAL_STAGES} />
                  <div className="flex items-center justify-between rounded-md border p-3"><div><Label htmlFor="closed">Mostrar encerradas</Label><p className="text-xs text-muted-foreground">Inclui finalizadas, canceladas e reprovadas.</p></div><Switch id="closed" checked={filters.includeClosed} onCheckedChange={(checked) => setFilter('includeClosed', checked)} /></div>
                  <Button variant="outline" className="w-full" onClick={() => { setFilters(EMPTY_FILTERS); updateUrl(view, EMPTY_FILTERS); }}><X className="mr-1.5 h-4 w-4" />Limpar filtros</Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        {activeFilterCount > 0 && <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Filter className="h-3.5 w-3.5" />Filtros ativos{filters.period !== 'all' && <Badge variant="secondary"><CalendarDays className="mr-1 h-3 w-3" />{filters.period}</Badge>}{filters.campus && <Badge variant="secondary"><MapPin className="mr-1 h-3 w-3" />{filters.campus}</Badge>}{filters.buyerId && <Badge variant="secondary"><UserRound className="mr-1 h-3 w-3" />Comprador</Badge>}</div>}
        <div className="flex gap-3 overflow-x-auto pb-3">{stages.map((stage) => <KanbanColumn key={stage} stage={stage} cards={grouped.get(stage) ?? []} canDrag={canDrag} onOpen={(card) => navigate(`/dashboard/ci/${card.id}`)} />)}</div>
      </div>
      <DragOverlay>{activeCard ? <div className="w-[285px]"><KanbanCard card={activeCard} canDrag={false} onOpen={() => {}} /></div> : null}</DragOverlay>
    </DndContext>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>;
}
