import { useEffect, useRef, useState, useCallback } from "react";

export type PanMode = "select" | "hand";

/**
 * useHandPan
 * - Pressione H para ativar modo "mão" (pan); V ou Esc para voltar a "select".
 * - Ignora eventos quando o foco estiver em campos editáveis.
 * - Em modo "hand", aplique os handlers retornados em um container com overflow
 *   para fazer pan do scroll (como Miro/Figma).
 */
export function useHandPan() {
  const [mode, setMode] = useState<PanMode>("select");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0, sl: 0, st: 0 });

  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        setMode("hand");
      } else if (e.key === "v" || e.key === "V" || e.key === "Escape") {
        setMode("select");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode !== "hand" || !containerRef.current) return;
    dragging.current = true;
    start.current = {
      x: e.clientX,
      y: e.clientY,
      sl: containerRef.current.scrollLeft,
      st: containerRef.current.scrollTop,
    };
    e.preventDefault();
  }, [mode]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    containerRef.current.scrollLeft = start.current.sl - dx;
    containerRef.current.scrollTop = start.current.st - dy;
  }, []);

  const endDrag = useCallback(() => { dragging.current = false; }, []);

  const cursorClass = mode === "hand"
    ? (dragging.current ? "cursor-grabbing" : "cursor-grab")
    : "";

  return {
    mode,
    setMode,
    containerRef,
    panHandlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp: endDrag,
      onMouseLeave: endDrag,
    },
    cursorClass,
    isHand: mode === "hand",
  };
}
