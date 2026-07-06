import { ReactNode } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TileEditOverlay } from "./TileEditOverlay";

interface Props {
  ids: string[];
  renderTile: (id: string) => ReactNode;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onReorder: (newOrder: string[]) => void;
}

function SortableItem({
  id, children, isFavorite, onToggleFavorite,
}: { id: string; children: ReactNode; isFavorite: boolean; onToggleFavorite: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative" {...attributes}>
      {children}
      <TileEditOverlay
        tileId={id}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        draggable
        dragHandleProps={listeners as any}
      />
    </div>
  );
}

export function MyGroupSection({
  ids, renderTile, favorites, onToggleFavorite, onReorder,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = ids.slice();
    next.splice(newIndex, 0, next.splice(oldIndex, 1)[0]);
    onReorder(next);
  }

  if (ids.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400 px-1 flex items-center gap-1.5">
        ★ Meu grupo
      </h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {ids.map((id) => (
              <SortableItem key={id} id={id} isFavorite={favorites.includes(id)} onToggleFavorite={onToggleFavorite}>
                {renderTile(id)}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
