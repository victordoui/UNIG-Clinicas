import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ScrollText } from 'lucide-react';
import { AuditLogFilters } from '@/components/admin/AuditLogFilters';
import { AuditLogTable } from '@/components/admin/AuditLogTable';
import type { AuditLogFilters as F } from '@/hooks/useAdmin';

export default function AdminLogs() {
  const [filters, setFilters] = useState<F>({ limit: 200 });
  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Logs do Sistema</h1>
            <p className="text-sm text-muted-foreground">Auditoria e histórico de ações (200 mais recentes por consulta).</p>
          </div>
        </div>
        <AuditLogFilters value={filters} onChange={setFilters} />
        <AuditLogTable filters={filters} />
      </div>
    </MainLayout>
  );
}
