import { useMemo, useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHandPan } from '@/hooks/useHandPan';
import { KANBAN_COLUMNS, canMoveStatus } from '@/lib/purchaseTransitions';
import { STATUS_LABEL, PRIORITY_LABEL, PRIORITY_BADGE, formatBRL, type PurchaseStatus } from '@/lib/purchaseLabels';
import { useChangeRequestStatus } from '@/hooks/usePurchaseApprovals';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseRequest } from '@/hooks/usePurchaseRequests';
import { useMyCostCenters } from '@/hooks/useUserCostCenters';
import { canSeeAllCostCenters, visibleCostCenterIds } from '@/lib/ccVisibility';
import { KanbanToolbar, type KanbanView, type KanbanPeriod, type KanbanDensity } from './KanbanToolbar';

function KanbanCard({ r, onClick }: { r: PurchaseRequest; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: r.id, data: { status: r.status } });
  return (
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`p-3 cursor-grab active:cursor-grabbing space-y-2 border-l-4 ${
        r.prioridade === 'urgente' ? 'border-l-red-500' :
        r.prioridade === 'alta' ? 'border-l-amber-500' :
        r.prioridade === 'normal' ? 'border-l-sky-500' : 'border-l-muted'
      } ${isDragging ? 'opacity-40' : 'hover:shadow-md'} transition-all`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">{r.numero}</span>
        <Badge variant="outline" className={`${PRIORITY_BADGE[r.prioridade]} text-[10px] py-0 px-1.5`}>
          {PRIORITY_LABEL[r.prioridade]}
        </Badge>
      </div>
      <div className="text-sm font-medium line-clamp-2">{r.item_descricao}</div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Qtd: {r.quantidade}</span>
        <span className="font-medium text-foreground">{formatBRL(r.valor_estimado)}</span>
      </div>
    </Card>
  );
}

function Column({ status, items, onCardClick }: { status: PurchaseStatus; items: PurchaseRequest[]; onCardClick: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="flex items-center justify-between px-2 mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{STATUS_LABEL[status]}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] rounded-lg p-2 space-y-2 transition-colors ${
          isOver ? 'bg-primary/10 ring-2 ring-primary/40' : 'bg-muted/40'
        }`}
      >
        {items.map(r => <KanbanCard key={r.id} r={r} onClick={() => onCardClick(r.id)} />)}
      </div>
    </div>
  );
}

export function PurchaseKanban({ requests }: { requests: PurchaseRequest[] }) {
  const navigate = useNavigate();
  const { unigRole } = useAuth();
  const { toast } = useToast();
  const change = useChangeRequestStatus();
  const { data: myCCs = [] } = useMyCostCenters();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ccFilter, setCcFilter] = useState<string>('all');
  const [groupByCC, setGroupByCC] = useState<boolean>(false);
  const { mode, setMode, containerRef, panHandlers, cursorClass, isHand } = useHandPan();
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  // Em modo "mão", não registra sensores → drag dos cards é desativado e o pan funciona.
  const sensors = useSensors(...(isHand ? [] : [pointerSensor]));

  const allowedIds = visibleCostCenterIds(unigRole, myCCs);
  const ccOptions = canSeeAllCostCenters(unigRole)
    ? Array.from(new Map(requests.filter(r => r.cost_center_id).map(r => [r.cost_center_id!, r.cost_center_id!])).entries())
        .map(([id]) => ({ id, nome: myCCs.find(c => c.id === id)?.nome ?? id.slice(0, 8) }))
    : myCCs.map(c => ({ id: c.id, nome: c.nome }));

  const filtered = useMemo(() => {
    let list = requests;
    if (allowedIds !== null) list = list.filter(r => r.cost_center_id && allowedIds.includes(r.cost_center_id));
    if (ccFilter !== 'all') list = list.filter(r => r.cost_center_id === ccFilter);
    return list;
  }, [requests, allowedIds, ccFilter]);

  const grouped = KANBAN_COLUMNS.reduce<Record<PurchaseStatus, PurchaseRequest[]>>((acc, s) => {
    acc[s] = filtered.filter(r => r.status === s);
    return acc;
  }, {} as any);
  const reprovadas = filtered.filter(r => r.status === 'reprovada');

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const id = String(e.active.id);
    const from = e.active.data.current?.status as PurchaseStatus;
    const to = e.over?.id as PurchaseStatus | undefined;
    if (!to || from === to) return;
    if (!canMoveStatus(unigRole, from, to)) {
      toast({
        title: 'Movimento não permitido',
        description: from === 'aguardando_aprovacao'
          ? 'Use os botões de aprovação na tela de detalhe.'
          : 'Esta transição não é permitida para seu papel.',
        variant: 'destructive',
      });
      return;
    }
    change.mutate({ id, status: to });
  }

  const active = filtered.find(r => r.id === activeId);

  // Swimlanes: render one Kanban row per CC present in `filtered`.
  const ccLanes = useMemo(() => {
    if (!groupByCC) return [] as { id: string; nome: string; items: PurchaseRequest[] }[];
    const map = new Map<string, PurchaseRequest[]>();
    for (const r of filtered) {
      const k = r.cost_center_id ?? '__none__';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return Array.from(map.entries()).map(([id, items]) => ({
      id,
      nome: id === '__none__' ? 'Sem centro de custo' : (myCCs.find(c => c.id === id)?.nome ?? ccOptions.find(c => c.id === id)?.nome ?? id.slice(0, 8)),
      items,
    }));
  }, [groupByCC, filtered, myCCs, ccOptions]);

  const renderRow = (items: PurchaseRequest[]) => {
    const g = KANBAN_COLUMNS.reduce<Record<PurchaseStatus, PurchaseRequest[]>>((acc, s) => {
      acc[s] = items.filter(r => r.status === s);
      return acc;
    }, {} as any);
    const rep = items.filter(r => r.status === 'reprovada');
    return (
      <div className="flex gap-3 overflow-x-auto pb-3">
        {KANBAN_COLUMNS.map(s => (
          <Column key={s} status={s} items={g[s]} onCardClick={id => navigate(`/solicitacoes/${id}`)} />
        ))}
        {rep.length > 0 && (
          <Column status="reprovada" items={rep} onCardClick={id => navigate(`/solicitacoes/${id}`)} />
        )}
      </div>
    );
  };

  // Toolbar state
  const [view, setView] = useState<KanbanView>('kanban');
  const [period, setPeriod] = useState<KanbanPeriod>('all');
  const [density, setDensity] = useState<KanbanDensity>('normal');
  const [highlightCritical, setHighlightCritical] = useState(false);

  // Period filter applied on top of CC filter
  const filteredByPeriod = useMemo(() => {
    if (period === 'all') return filtered;
    const now = new Date();
    const cutoff = new Date(now);
    if (period === 'day') cutoff.setHours(0, 0, 0, 0);
    if (period === 'week') cutoff.setDate(now.getDate() - 7);
    if (period === 'month') cutoff.setDate(now.getDate() - 30);
    return filtered.filter(r => new Date(r.created_at) >= cutoff);
  }, [filtered, period]);

  return (
    <DndContext sensors={sensors} onDragStart={e => setActiveId(String(e.active.id))} onDragEnd={onDragEnd}>
      <KanbanToolbar
        view={view} setView={setView}
        period={period} setPeriod={setPeriod}
        density={density} setDensity={setDensity}
        mode={mode} setMode={setMode}
        highlightCritical={highlightCritical} setHighlightCritical={setHighlightCritical}
      />

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Centro de Custo</Label>
          <Select value={ccFilter} onValueChange={setCcFilter}>
            <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {ccOptions.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="group-cc" checked={groupByCC} onCheckedChange={setGroupByCC} />
          <Label htmlFor="group-cc" className="text-xs text-muted-foreground cursor-pointer">Agrupar por CC</Label>
        </div>
      </div>

      <div className="w-full min-w-0 max-w-full overflow-hidden">
        {groupByCC ? (
          <div
            ref={containerRef}
            {...panHandlers}
            className={`space-y-6 overflow-x-auto ${cursorClass} ${isHand ? 'select-none' : ''}`}
          >
            {ccLanes.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma requisição visível.</div>}
            {ccLanes.map(lane => (
              <div key={lane.id}>
                <div className="text-sm font-semibold mb-2 px-1">{lane.nome} <span className="text-xs text-muted-foreground">({lane.items.length})</span></div>
                <div className="flex gap-3 pb-3">
                  {KANBAN_COLUMNS.map(s => (
                    <Column key={s} status={s} items={lane.items.filter(r => r.status === s)} onCardClick={id => navigate(`/solicitacoes/${id}`)} />
                  ))}
                  {lane.items.filter(r => r.status === 'reprovada').length > 0 && (
                    <Column status="reprovada" items={lane.items.filter(r => r.status === 'reprovada')} onCardClick={id => navigate(`/solicitacoes/${id}`)} />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={containerRef}
            {...panHandlers}
            className={`flex gap-3 overflow-x-auto pb-3 ${cursorClass} ${isHand ? 'select-none' : ''}`}
          >
            {KANBAN_COLUMNS.map(s => (
              <Column key={s} status={s} items={grouped[s]} onCardClick={id => navigate(`/solicitacoes/${id}`)} />
            ))}
            {reprovadas.length > 0 && (
              <Column status="reprovada" items={reprovadas} onCardClick={id => navigate(`/solicitacoes/${id}`)} />
            )}
          </div>
        )}
      </div>

      <DragOverlay>
        {active ? <KanbanCard r={active} onClick={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
