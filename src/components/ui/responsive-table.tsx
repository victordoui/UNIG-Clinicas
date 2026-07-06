import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export interface ResponsiveColumn<T> {
  /** column key (also used as React key) */
  key: string;
  /** header label */
  header: ReactNode;
  /** cell renderer */
  cell: (row: T) => ReactNode;
  /** Hide on mobile card layout */
  hideOnMobile?: boolean;
  /** Use as the card title on mobile (one column) */
  mobilePrimary?: boolean;
  /** Optional className for desktop TableCell */
  className?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: ResponsiveColumn<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  className?: string;
}

/**
 * Renders a normal <Table> on desktop and a stack of cards on mobile.
 * Same column definitions drive both layouts.
 */
export function ResponsiveTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  emptyState,
  className,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  if (!isMobile) {
    return (
      <div className={cn("w-full overflow-x-auto", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow
                key={rowKey(row)}
                className={onRowClick ? "cursor-pointer" : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Mobile: card stack
  const visibleColumns = columns.filter((c) => !c.hideOnMobile);
  const primary = visibleColumns.find((c) => c.mobilePrimary) ?? visibleColumns[0];
  const rest = visibleColumns.filter((c) => c.key !== primary?.key);

  return (
    <div className={cn("space-y-2", className)}>
      {data.map((row) => (
        <Card
          key={rowKey(row)}
          className={cn(
            "p-3 transition-all hover:border-primary/40 active:scale-[0.99]",
            onRowClick && "cursor-pointer"
          )}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="font-medium text-sm truncate flex-1 min-w-0">
              {primary?.cell(row)}
            </div>
            {onRowClick && (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </div>
          {rest.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              {rest.map((col) => (
                <div key={col.key} className="min-w-0">
                  <dt className="text-muted-foreground truncate">{col.header}</dt>
                  <dd className="font-medium truncate">{col.cell(row)}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      ))}
    </div>
  );
}
