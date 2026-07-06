import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { exportToExcel } from '@/lib/exportUtils';
import { exportAuditLogsToPdf, CRITICAL_ACTIONS } from '@/lib/auditPdfExport';
import { AuditFilters } from '@/components/audit/AuditFilters';
import { AuditLogTable } from '@/components/audit/AuditLogTable';
import { AuditLogDetailModal } from '@/components/audit/AuditLogDetailModal';
import { ShieldCheck } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  product_created: 'Produto Criado',
  product_updated: 'Produto Atualizado',
  product_deleted: 'Produto Excluído',
  movement_created: 'Movimentação',
  user_invited: 'Usuário Convidado',
  user_removed: 'Usuário Removido',
};

export default function Auditoria() {
  const { organization, isSuperAdmin, loading: authLoading, currentRole } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [detailLog, setDetailLog] = useState<any | null>(null);
  const logsPerPage = 50;

  useEffect(() => {
    if (!authLoading && currentRole !== 'admin' && !isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [currentRole, isSuperAdmin, authLoading, navigate]);

  useEffect(() => {
    if (currentRole === 'admin' || isSuperAdmin) {
      loadOrganizations();
      loadUsers();
      loadAuditLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRole, isSuperAdmin, currentPage]);

  const loadOrganizations = async () => {
    const { data } = await supabase.from('organizations').select('id, name, subscription_plan').order('name');
    setOrganizations(data || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
    setUsers(data || []);
  };

  const buildBaseQuery = (countOnly = false) => {
    let q = countOnly
      ? supabase.from('security_audit_log').select('*', { count: 'exact', head: true })
      : supabase
          .from('security_audit_log')
          .select(`*, profiles:user_id(id, full_name, email, avatar_url), organizations:organization_id(id, name, subscription_plan)`)
          .order('created_at', { ascending: false });
    if (!isSuperAdmin && organization?.organization_id) q = q.eq('organization_id', organization.organization_id);
    if (selectedOrgId) q = q.eq('organization_id', selectedOrgId);
    if (selectedUserId) q = q.eq('user_id', selectedUserId);
    if (actionFilter !== 'all') q = q.eq('action', actionFilter);
    if (startDate) q = q.gte('created_at', startDate.toISOString());
    if (endDate) q = q.lte('created_at', endDate.toISOString());
    if (onlyCritical) q = q.in('action', Array.from(CRITICAL_ACTIONS));
    return q;
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const { count } = await buildBaseQuery(true);
      setTotalLogs(count || 0);
      const { data } = await buildBaseQuery(false).range((currentPage - 1) * logsPerPage, currentPage * logsPerPage - 1);
      setLogs(data || []);
    } catch {
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentFilterLabels = () => ({
    organization: organizations.find(o => o.id === selectedOrgId)?.name || null,
    user: users.find(u => u.id === selectedUserId)?.full_name || null,
    action: actionFilter,
    startDate,
    endDate,
    onlyCritical,
  });

  const handleExportToExcel = () => {
    const exportData = logs.map(log => ({
      'ID': log.id,
      'Organização': log.organizations?.name || 'N/A',
      'Plano': log.organizations?.subscription_plan || 'N/A',
      'Usuário': log.profiles?.full_name || 'N/A',
      'Email': log.profiles?.email || 'N/A',
      'Ação': ACTION_LABELS[log.action] || log.action,
      'Crítico': CRITICAL_ACTIONS.has(log.action) ? 'Sim' : 'Não',
      'Detalhes': JSON.stringify(log.details),
      'IP': log.ip_address || 'N/A',
      'User Agent': log.user_agent || 'N/A',
      'Data/Hora': format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
    }));
    exportToExcel(exportData, `auditoria_${format(new Date(), 'yyyy-MM-dd')}.xlsx`, 'Logs de Auditoria');
    toast.success('Logs exportados com sucesso!');
  };

  const handleExportToPdf = async () => {
    try {
      // Busca todos os registros filtrados (até 1000)
      const { data } = await buildBaseQuery(false).range(0, 999);
      exportAuditLogsToPdf({ logs: data || [], filters: getCurrentFilterLabels() });
      toast.success('PDF gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  };

  if (authLoading || (currentRole !== 'admin' && !isSuperAdmin)) return null;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /> Auditoria</h1>
          <p className="text-muted-foreground">Logs de atividades do sistema</p>
        </div>

        <AuditFilters
          organizations={organizations}
          users={users}
          selectedOrgId={selectedOrgId}
          selectedUserId={selectedUserId}
          actionFilter={actionFilter}
          startDate={startDate}
          endDate={endDate}
          onlyCritical={onlyCritical}
          onOrgChange={setSelectedOrgId}
          onUserChange={setSelectedUserId}
          onActionChange={setActionFilter}
          onDateChange={(start, end) => { setStartDate(start); setEndDate(end); }}
          onOnlyCriticalChange={setOnlyCritical}
          onApply={() => { setCurrentPage(1); loadAuditLogs(); }}
          onClear={() => {
            setSelectedOrgId(null); setSelectedUserId(null); setActionFilter('all');
            setStartDate(null); setEndDate(null); setOnlyCritical(false); setCurrentPage(1);
            setTimeout(() => loadAuditLogs(), 100);
          }}
          onExport={handleExportToExcel}
          onExportPdf={handleExportToPdf}
        />

        <AuditLogTable
          logs={logs}
          loading={loading}
          currentPage={currentPage}
          totalPages={Math.ceil(totalLogs / logsPerPage)}
          totalLogs={totalLogs}
          onPageChange={setCurrentPage}
          onViewDetails={setDetailLog}
        />

        <AuditLogDetailModal
          log={detailLog}
          open={!!detailLog}
          onOpenChange={(o) => !o && setDetailLog(null)}
        />
      </div>
    </MainLayout>
  );
}
