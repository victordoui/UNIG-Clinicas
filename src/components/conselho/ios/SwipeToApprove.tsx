import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronsRight, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeToApproveProps {
  label?: string;
  successLabel?: string;
  onComplete: () => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

/**
 * Controle "Deslize para aprovar".
 * Drag horizontal de 0 → 100%. Ao chegar a 100%, chama onComplete().
 */
export function SwipeToApprove({
  label = 'Deslize para aprovar',
  successLabel = 'Compra aprovada',
  onComplete,
  disabled,
  className,
}: SwipeToApproveProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const startXRef = useRef(0);
  const widthRef = useRef(0);

  const reset = useCallback(() => setProgress(0), []);

  const finish = useCallback(async () => {
    if (state !== 'idle') return;
    setState('loading');
    try {
      await onComplete();
      setState('done');
    } catch {
      setState('idle');
      setProgress(0);
    }
  }, [onComplete, state]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || state !== 'idle') return;
    const track = trackRef.current;
    if (!track) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    widthRef.current = track.clientWidth - 56; // 56 = knob width
    startXRef.current = e.clientX - progress * widthRef.current;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const w = widthRef.current || 1;
    const next = Math.max(0, Math.min(1, (e.clientX - startXRef.current) / w));
    setProgress(next);
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (progress >= 0.92) {
      setProgress(1);
      finish();
    } else {
      setProgress(0);
    }
  };

  useEffect(() => {
    if (state === 'done') {
      const t = setTimeout(reset, 1400);
      return () => clearTimeout(t);
    }
  }, [state, reset]);

  const pct = Math.round(progress * 100);

  return (
    <div
      ref={trackRef}
      className={cn(
        'relative h-14 w-full rounded-full overflow-hidden select-none touch-none',
        'bg-muted/60 border border-border/40',
        disabled && 'opacity-50',
        className
      )}
    >
      {/* fill */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 transition-colors',
          state === 'done' ? 'bg-ios-green' : 'bg-ios-green/85'
        )}
        style={{ width: `calc(${pct}% + 28px)`, transition: dragging ? 'none' : 'width 200ms ease' }}
      />

      {/* label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className={cn(
            'text-[14px] font-semibold transition-colors',
            progress > 0.4 || state !== 'idle' ? 'text-white' : 'text-ios-text/70'
          )}
        >
          {state === 'done' ? successLabel : label}
        </span>
      </div>

      {/* knob */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          'absolute top-1 left-1 h-12 w-12 rounded-full bg-ios-blue text-white flex items-center justify-center shadow-md',
          'cursor-grab active:cursor-grabbing',
          state === 'done' && 'bg-white text-ios-green'
        )}
        style={{
          transform: `translateX(${progress * (widthRef.current || 0)}px)`,
          transition: dragging ? 'none' : 'transform 200ms ease',
        }}
      >
        {state === 'loading' ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : state === 'done' ? (
          <Check className="h-5 w-5" strokeWidth={3} />
        ) : (
          <ChevronsRight className="h-5 w-5" strokeWidth={2.5} />
        )}
      </div>
    </div>
  );
}
