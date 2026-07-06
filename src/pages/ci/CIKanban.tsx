import { MainLayout } from '@/components/layout/MainLayout';
import { useCIList, useUpdateCIStatus } from '@/hooks/useCI';
import { CI_KANBAN_COLUMNS, CI_STATUS_LABEL, CI_PRIORITY_BADGE, CI_PRIORITY_LABEL } from '@/lib/ciLabels';
import { DndContext, closestCenter, useDraggable, useDroppable, useSensor, useSensors, PointerSensor, type DragEndEvent } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hand, MousePointer2, Eye, KanbanSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHandPan } from '@/hooks/useHandPan';
import { useAuth } from '@/hooks/useAuth';

const ROLES_CAN_MOVE_CI = ['super_admin', 'administrador', 'coordenador_operacoes', 'gerente_geral', 'compras', 'almoxarifado'];

function CICard({ ci, isHand }: { ci: any; isHand: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: ci.id, disabled: isHand });
  const style: React.CSSProperties = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : {};
  return (
    <Card
      ref={setNodeRef} style={style} {...(isHand ? {} : listeners)} {...attributes}
      className={`p-3 mb-2 ${isHand ? '' : 'cursor-grab'} bg-card shadow-sm hover:shadow ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex justify-between items-start gap-2 mb-1">
        <Link to={`/dashboard/ci/${ci.id}`} className="font-mono text-xs text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
          {ci.protocol}
        </Link>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${CI_PRIORITY_BADGE[ci.priority as keyof typeof CI_PRIORITY_BADGE]}`}>
          {CI_PRIORITY_LABEL[ci.priority as keyof typeof CI_PRIORITY_LABEL]}
        </span>
      </div>
      <div className="text-sm font-medium leading-tight">{ci.subject}</div>
      <div className="text-xs text-muted-foreground mt-1">{ci.requester_name} · {ci.destination_sector ?? '—'}</div>
    </Card>
  );
}

function Column({ status, items, isHand }: { status: string; items: any[]; isHand: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={`min-w-[260px] w-[260px] rounded-lg border bg-muted/20 p-2 ${isOver ? 'ring-2 ring-primary/40' : ''}`}>
      <div className="font-medium text-sm px-2 py-1 mb-1 flex justify-between">
        <span>{CI_STATUS_LABEL[status as keyof typeof CI_STATUS_LABEL]}</span>
        <span className="text-muted-foreground text-xs">{items.length}</span>
      </div>
      {items.map(ci => <CICard key={ci.id} ci={ci} isHand={isHand} />)}
    </div>
  );
}

export default function CIKanban() {
  const { data } = useCIList();
  const update = useUpdateCIStatus();
  const items = data ?? [];
  const { unigRole, isSuperAdmin } = useAuth();
  const canMove = isSuperAdmin || (!!unigRole && ROLES_CAN_MOVE_CI.includes(unigRole));
  const { mode, setMode, containerRef, panHandlers, cursorClass, isHand: rawIsHand } = useHandPan();
  const isHand = canMove ? rawIsHand : true; // read-only roles always pan
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const sensors = useSensors(...(isHand ? [] : [pointerSensor]));

  function onDragEnd(e: DragEndEvent) {
    if (!canMove) return;
    const id = String(e.active.id);
    const target = e.over?.id ? String(e.over.id) : null;
    const ci = items.find(c => c.id === id);
    if (!target || !ci || ci.status === target) return;
    update.mutate({ id, status: target as any });
  }

  return (
    <MainLayout>
      <div className="space-y-4 min-w-0 max-w-full">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2 flex-1"><KanbanSquare className="h-6 w-6 text-primary" /> Kanban</h1>
          {canMove ? (
            <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
              <Button type="button" size="sm" variant={mode === 'select' ? 'secondary' : 'ghost'} className="h-7 px-2" onClick={() => setMode('select')} title="Selecionar (V)">
                <MousePointer2 className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="sm" variant={mode === 'hand' ? 'secondary' : 'ghost'} className="h-7 px-2" onClick={() => setMode('hand')} title="Mão / pan (H)">
                <Hand className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Badge variant="outline" className="text-[10px] gap-1"><Eye className="h-3 w-3" /> Somente leitura</Badge>
          )}
          {canMove && isHand && <Badge variant="outline" className="text-[10px]">Modo mão (H) — V para selecionar</Badge>}
        </div>
        <div className="min-w-0 max-w-full overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <div
              ref={containerRef}
              {...panHandlers}
              className={`flex gap-3 overflow-x-auto pb-3 ${cursorClass} ${isHand ? 'select-none' : ''}`}
            >
              {CI_KANBAN_COLUMNS.map(s => (
                <Column key={s} status={s} items={items.filter(i => i.status === s)} isHand={isHand} />
              ))}
            </div>
          </DndContext>
        </div>
      </div>
    </MainLayout>
  );
}
