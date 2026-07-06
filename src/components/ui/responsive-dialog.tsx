import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * ResponsiveDialog
 * - Desktop: renders as a centered <Dialog>.
 * - Mobile (<768px): renders as a bottom <Sheet> filling the viewport with
 *   scroll inside the body and a sticky footer above the safe-area.
 *
 * Drop-in replacement for Dialog in modals that overflow on mobile.
 * It deliberately does NOT change colors, business logic, or styling tokens.
 */
interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Footer (action buttons). Will be sticky at the bottom on mobile. */
  footer?: React.ReactNode;
  /** Max width for the desktop dialog (Tailwind class), default `sm:max-w-lg`. */
  className?: string;
  /** Optional class for the scrollable body container. */
  bodyClassName?: string;
  children?: React.ReactNode;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  className,
  bodyClassName,
  children,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn(
            "flex flex-col p-0 gap-0",
            "h-[92dvh] max-h-[92dvh] rounded-t-2xl border-t",
            className
          )}
        >
          {(title || description) && (
            <SheetHeader className="px-4 pt-4 pb-3 text-left border-b">
              {title && <SheetTitle>{title}</SheetTitle>}
              {description && <SheetDescription>{description}</SheetDescription>}
            </SheetHeader>
          )}
          <div
            className={cn(
              "flex-1 overflow-y-auto overscroll-contain px-4 py-4",
              bodyClassName
            )}
          >
            {children}
          </div>
          {footer && (
            <SheetFooter
              className={cn(
                "px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]",
                "border-t bg-background",
                "flex-col-reverse sm:flex-row gap-2"
              )}
            >
              {footer}
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0",
          className
        )}
      >
        {(title || description) && (
          <DialogHeader className="px-6 pt-6 pb-3 text-left">
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div className={cn("flex-1 overflow-y-auto px-6 py-2", bodyClassName)}>
          {children}
        </div>
        {footer && (
          <DialogFooter className="px-6 py-4 border-t">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
