import { Star, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface TileEditOverlayProps {
  tileId: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  draggable?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

/**
 * Overlay shown on top of a tile while in edit mode. Blocks the underlying
 * Link click and exposes a favorite toggle + (optional) drag handle.
 */
export function TileEditOverlay({
  tileId,
  isFavorite,
  onToggleFavorite,
  draggable,
  dragHandleProps,
}: TileEditOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-10 bg-background/40 backdrop-blur-[1px] rounded-md border-2 border-dashed border-primary/40 flex items-start justify-between p-2"
      onClick={(e) => {
        // Block navigation when clicking on the overlay area itself
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {draggable ? (
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing rounded bg-background/80 p-1 shadow-sm border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite(tileId);
        }}
        className={cn(
          "rounded-full p-1.5 shadow-sm border transition-colors",
          isFavorite
            ? "bg-amber-400 border-amber-500 text-white hover:bg-amber-500"
            : "bg-background border-border text-muted-foreground hover:text-amber-500 hover:border-amber-400",
        )}
        aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
      </button>
    </div>
  );
}
