import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Lucide icon component rendered before the title. */
  icon?: LucideIcon;
  /** Page title (shown as h1). */
  title: ReactNode;
  /** Short description below the title. */
  description?: ReactNode;
  /** Action buttons rendered on the right (wraps on mobile). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Standard page header used across the app.
 * Visual reference: "Convites de Fornecedores" — icon + title in primary color,
 * text-2xl font-bold, icon h-6 w-6 text-primary, optional description and actions.
 */
export function PageHeader({ icon: Icon, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 flex-wrap", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {Icon && <Icon className="h-6 w-6 text-primary" />}
          <span>{title}</span>
        </h1>
        {description && (
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
