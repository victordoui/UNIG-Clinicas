import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { auditActionTone, fmtDateTime, safeJsonStringify } from '@/lib/admin';
import type { AuditLogFilters as F } from '@/hooks/useAdmin';
import { useAuditLogs } from '@/hooks/useAdmin';

const toneClass: Record<string, string> = {
  success: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  destructive: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  default: 'bg-muted text-muted-foreground border-border',
};

export function AuditLogTable({ filters }: { filters: F }) {
  const { data = [], isLoading } = useAuditLogs(filters);
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[170px]">Quando</TableHead>
            <TableHead>Ator</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Tabela</TableHead>
            <TableHead>Entidade</TableHead>
            <TableHead>Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Carregando…</TableCell></TableRow>}
          {!isLoading && (data as any[]).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhum registro</TableCell></TableRow>}
          {(data as any[]).map(row => (
            <TableRow key={row.id}>
              <TableCell className="text-xs whitespace-nowrap">{fmtDateTime(row.created_at)}</TableCell>
              <TableCell className="text-xs">{row.actor?.full_name ?? row.actor_id ?? '—'}</TableCell>
              <TableCell>
                <Badge variant="outline" className={toneClass[auditActionTone(row.action)]}>{row.action}</Badge>
              </TableCell>
              <TableCell className="text-xs font-mono">{row.entity_table}</TableCell>
              <TableCell className="text-xs font-mono truncate max-w-[140px]">{row.entity_id ?? '—'}</TableCell>
              <TableCell>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">ver</summary>
                  <pre className="mt-1 max-w-md whitespace-pre-wrap break-all bg-muted/50 p-2 rounded">{safeJsonStringify(row.metadata)}</pre>
                </details>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
