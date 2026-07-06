import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  useOperationalDemands, isOverdue, OperationalDemand, DEMAND_STATUS, DEMAND_STATUS_LABEL,
  DEMAND_TYPE_LABEL, useOrgGestores,
} from '@/hooks/useOperationalDemands';
import { DemandStatusBadge, DemandPriorityBadge } from '@/components/demandas/DemandBadges';
import { ManagerSummaryDialog } from '@/components/demandas/ManagerSummaryDialog';
import { buildUnitSummary } from '@/lib/demandSummary';
import { Building2, Briefcase, Clock, AlertTriangle, CheckCircle2, Flame, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DemandasHistoricoUnidade() {
  const { data: all = [] } = useOperationalDemands();
  const { data: gestores = [] } = useOrgGestores();
  const [unidade, setUnidade] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gestorFilter, setGestorFilter] = useState<string>('all');
  const [period, setPeriod] = useState<string>('all'); // YYYY-MM or 'all'

  const unidades = useMemo(
    () => Array.from(new Set(all.map((d) => d.unidade).filter(Boolean))).sort(),
    [all],
  );

  const filtered = useMemo(() => {
    return all.filter((d) => {
      if (!unidade) return false;
      if (d.unidade !== unidade) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (gestorFilter !== 'all' && d.gestor_responsavel !== gestorFilter) return false;
      if (period !== 'all') {
        const dt = new Date(d.updated_at);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        if (key !== period) return false;
      }
      return true;
    });
  }, [all, unidade, statusFilter, gestorFilter, period]);

  const stats = useMemo(() => {
    const now = new Date();
    const inMonth = (d: OperationalDemand) => {
      const dt = new Date(d.updated_at);
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    };
    return {
      total: filtered.length,
      andamento: filtered.filter((d) => d.status === 'em_execucao').length,
      concluidas: filtered.filter((d) => d.status === 'concluida').length,
      atrasadas: filtered.filter(isOverdue).length,
      urgentes: filtered.filter((d) => d.prioridade === 'urgente' && d.status !== 'concluida' && d.status !== 'cancelada').length,
      concluidasMes: filtered.filter((d) => d.status === 'concluida' && inMonth(d)).length,
    };
  }, [filtered]);

  const periods = useMemo(() => {
    const set = new Set<string>();
    all.forEach((d) => {
      const dt = new Date(d.updated_at);
      set.add(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [all]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> Histórico por unidade
          </div>
          <h1 className="text-2xl font-bold mt-1">Histórico Consolidado por Unidade</h1>
          <p className="text-sm text-muted-foreground">Selecione uma unidade para ver o histórico de demandas e projetos.</p>
        </div>
        {unidade && (
          <ManagerSummaryDialog
            buildSummary={() => buildUnitSummary(unidade, filtered)}
            triggerLabel="Gerar resumo para diretoria"
          />
        )}
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Unidade</Label>
            <Select value={unidade || ''} onValueChange={setUnidade}>
              <SelectTrigger><SelectValue placeholder="Selecione uma unidade" /></SelectTrigger>
              <SelectContent>
                {unidades.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {DEMAND_STATUS.map((s) => <SelectItem key={s} value={s}>{DEMAND_STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Gestor</Label>
            <Select value={gestorFilter} onValueChange={setGestorFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {gestores.map((g) => <SelectItem key={g.id} value={g.id}>{g.full_name ?? g.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Período</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {periods.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {!unidade ? (
        <Card className="p-10 text-center text-muted-foreground">
          Selecione uma unidade para visualizar o histórico consolidado.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard icon={Briefcase} label="Total" value={stats.total} color="slate" />
            <KpiCard icon={Briefcase} label="Em andamento" value={stats.andamento} color="emerald" />
            <KpiCard icon={CheckCircle2} label="Concluídas" value={stats.concluidas} color="green" />
            <KpiCard icon={AlertTriangle} label="Atrasadas" value={stats.atrasadas} color="rose" />
            <KpiCard icon={Flame} label="Urgentes" value={stats.urgentes} color="orange" />
            <KpiCard icon={Clock} label="Concluídas no mês" value={stats.concluidasMes} color="amber" />
          </div>

          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Histórico cronológico</h3>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem registros para os filtros aplicados.</p>
            ) : (
              <ul className="space-y-2">
                {[...filtered]
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                  .map((d) => (
                    <li key={d.id}>
                      <Link to={`/demandas/${d.id}`} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/40 transition">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{d.code}</span>
                            <span>•</span>
                            <span>{DEMAND_TYPE_LABEL[d.tipo]}</span>
                            <span>•</span>
                            <span>Atualizada {format(new Date(d.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                          </div>
                          <div className="font-medium text-sm mt-0.5 truncate">{d.nome}</div>
                          {d.proximas_etapas && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              <b>Próximas etapas:</b> {d.proximas_etapas}
                            </div>
                          )}
                          {d.dependencies && (
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              <b>Dependências:</b> {d.dependencies}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <DemandStatusBadge status={d.status} />
                          <DemandPriorityBadge priority={d.prioridade} />
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

const COLOR_MAP: Record<string, string> = {
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  green: 'bg-green-50 text-green-700 border-green-200',
};

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card className={`p-4 border ${COLOR_MAP[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        <Icon className="h-8 w-8 opacity-70" />
      </div>
    </Card>
  );
}
