import { ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ObjectPageBreadcrumb {
  label: string;
  to?: string;
}

interface ObjectPageHeaderProps {
  /** Optional breadcrumb trail rendered above the back button. */
  breadcrumbs?: ObjectPageBreadcrumb[];
  /** Where the "Voltar" button navigates. If omitted, uses navigate(-1). */
  backTo?: string;
  /** Mono document number rendered above the title. */
  numero?: ReactNode;
  /** Main title. */
  title: ReactNode;
  /** Optional icon next to the title. */
  titleIcon?: ReactNode;
  /** Badges row (status, priority, dates, links). */
  badges?: ReactNode;
  /** Action buttons (top-right on desktop, wraps on mobile). */
  actions?: ReactNode;
  /** Optional content rendered inside CardContent (e.g. metadata grid). */
  children?: ReactNode;
  className?: string;
}

/**
 * Standard Object Page header for detail screens.
 * Visually equivalent to the existing Card + CardHeader pattern already used
 * across SC, Pedido, Cotação, Recebimento — just centralized for consistency.
 */
export function ObjectPageHeader({
  breadcrumbs,
  backTo,
  numero,
  title,
  titleIcon,
  badges,
  actions,
  children,
  className,
}: ObjectPageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className={cn("space-y-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="breadcrumb"
          className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap"
        >
          {breadcrumbs.map((b, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={i} className="flex items-center gap-1">
                {b.to && !isLast ? (
                  <Link to={b.to} className="hover:text-foreground transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-foreground font-medium" : ""}>
                    {b.label}
                  </span>
                )}
                {!isLast && <ChevronRight className="h-3 w-3" />}
              </span>
            );
          })}
        </nav>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="min-w-0">
            {numero && (
              <div className="font-mono text-xs text-muted-foreground">{numero}</div>
            )}
            <CardTitle className="text-2xl flex items-center gap-2 flex-wrap">
              {titleIcon}
              <span>{title}</span>
            </CardTitle>
            {badges && (
              <div className="flex gap-2 mt-2 flex-wrap items-center">{badges}</div>
            )}
          </div>
          {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
        </CardHeader>
        {children && (
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {children}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
