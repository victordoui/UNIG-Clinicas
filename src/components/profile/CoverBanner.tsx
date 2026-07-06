import { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CoverState, resolveCoverStyle } from '@/hooks/useProfileCover';

type Props = {
  cover: CoverState;
  className?: string;
  children: ReactNode;
  onEdit?: () => void;
  showEditButton?: boolean;
};

export function CoverBanner({ cover, className, children, onEdit, showEditButton = true }: Props) {
  const resolved = resolveCoverStyle(cover);

  return (
    <section
      className={cn(
        'relative w-full overflow-hidden rounded-3xl text-white shadow-lg shadow-blue-900/10',
        className,
      )}


      style={{
        background: resolved.base ?? '#1E40AF',
      }}
    >
      {/* image layer (right side) */}
      {resolved.imageUrl && (
        <div
          className="absolute inset-0 pointer-events-none bg-no-repeat"
          style={{
            backgroundImage: `url(${resolved.imageUrl})`,
            backgroundPosition: resolved.backgroundPosition ?? 'center',
            backgroundSize: resolved.backgroundSize ?? 'cover',
          }}
          aria-hidden
        />
      )}

      {/* color/gradient overlay on top of image */}
      {resolved.overlay && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: resolved.overlay }}
          aria-hidden
        />
      )}


      {/* soft radial highlight */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 85% 30%, white 0%, transparent 55%)' }}
        aria-hidden
      />

      {/* Edit button */}
      {showEditButton && onEdit && (
        <Button
          size="icon"
          variant="ghost"
          onClick={onEdit}
          className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-white/15 text-white hover:bg-white/30 hover:text-white"
          aria-label="Editar capa"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}

      {/* content */}
      <div className="relative">{children}</div>


    </section>
  );
}

