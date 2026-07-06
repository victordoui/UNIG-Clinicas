import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield } from 'lucide-react';
import { AuditLogRow } from './AuditLogRow';
import { useState } from 'react';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
  organization_id: string | null;
  user_agent: string | null;
  ip_address: string | null;
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  organizations?: {
    name: string;
    subscription_plan: string;
  };
}

interface AuditLogTableProps {
  logs: AuditLog[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalLogs: number;
  onPageChange: (page: number) => void;
  onViewDetails?: (log: AuditLog) => void;
}

export function AuditLogTable({ 
  logs, 
  loading, 
  currentPage, 
  totalPages,
  totalLogs,
  onPageChange,
  onViewDetails,
}: AuditLogTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Logs de Auditoria
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {totalLogs} registros • Página {currentPage} de {totalPages || 1}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum log de auditoria encontrado.
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organização</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <AuditLogRow
                      key={log.id}
                      log={log}
                      expanded={expandedRow === log.id}
                      onToggle={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                      onViewDetails={onViewDetails}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const page = Math.max(1, currentPage - 2) + i;
                  if (page > totalPages) return null;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onPageChange(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
