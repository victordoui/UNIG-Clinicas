import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface StickyActionBarProps {
  children: ReactNode;
  /** Show only on mobile (default true). Set false to always show. */
  mobileOnly?: boolean;
  className?: string;
}

/**
 * Bottom-fixed action bar for mobile detail screens.
 * Sits above the BottomNav (which is h-16) so it never overlaps.
 */
export function StickyActionBar({
  children,
  mobileOnly = true,
  className,
}: StickyActionBarProps) {
  const isMobile = useIsMobile();
  if (mobileOnly && !isMobile) return null;

  return (
    <>
      {/* Spacer so the page content can scroll past the bar */}
      <div aria-hidden className="h-20" />
      <div
        className={cn(
          "fixed left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur",
          "px-3 py-2 shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.15)]",
          // BottomNav is h-16 + safe-area on mobile; sit above it
          isMobile
            ? "bottom-[calc(4rem+env(safe-area-inset-bottom))]"
            : "bottom-0",
          className
        )}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          {children}
        </div>
      </div>
    </>
  );
}
