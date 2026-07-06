import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, Clock, AlertTriangle, CheckCircle2, ListChecks, Plus, Flame, ArrowRight } from 'lucide-react';
import {
  useOperationalDemands, isOverdue, DEMAND_STATUS, DEMAND_STATUS_LABEL,
  DEMAND_PRIORITY, DEMAND_PRIORITY_LABEL, useOrgGestores, OperationalDemand,
  useIsDemandsManagerView,
} from '@/hooks/useOperationalDemands';
import { DemandStatusBadge, DemandPriorityBadge } from '@/components/demandas/DemandBadges';
import { ManagerSummaryDialog } from '@/components/demandas/ManagerSummaryDialog';
import { buildGeneralSummary } from '@/lib/demandSummary';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DemandasPainel() {
  const isManagerView = useIsDemandsManagerView();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>('all');
  const [gestorFilter, setGestorFilter] = useState<string>('all');
  const [unidadeFilter, setUnidadeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: gestores = [] } = useOrgGestores();
  const { data: all = [], isLoading } = useOperationalDemands({
    status: statusFilter as any,
    prioridade: prioridadeFilter as any,
    gestorId: gestorFilter,
    unidade: unidadeFilter,
    search,
  });

  const unidades = useMemo(
    () => Array.from(new Set(all.map((d) => d.unidade).filter(Boolean))).sort(),
    [all],
  );

  const stats = useMemo(() => {
    const now = new Date();
    const inMonth = (d: OperationalDemand) => {
      const dt = new Date(d.updated_at);
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    };
    return {
      total: all.length,
      andamento: all.filter((d) => d.status === 'em_execucao').length,
      aguardando: all.filter((d) => d.status.startsWith('aguardando')).length,
      atrasadas: all.filter(isOverdue).length,
      urgentes: all.filter((d) => d.prioridade === 'urgente' && d.status !== 'concluida' && d.status !== 'cancelada').length,
      concluidasMes: all.filter((d) => d.status === 'concluida' && inMonth(d)).length,
    };
  }, [all]);

  const recentes = useMemo(() => [...all].slice(0, 6), [all]);
  const proximas = useMemo(
    () => [...all]
      .filter((d) => d.prazo_estimado && !['concluida', 'cancelada'].includes(d.status))
      .sort((a, b) => new Date(a.prazo_estimado!).getTime() - new Date(b.prazo_estimado!).getTime())
      .slice(0, 6),
    [all],
  );
  const atrasadas = useMemo(() => all.filter(isOverdue).slice(0, 6), [all]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Hero gerencial */}
      <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 md:p-8 text-primary-foreground shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider bg-primary-foreground/15 backdrop-blur-sm border border-primary-foreground/20 px-3 py-1 rounded-full">
              <Briefcase className="h-3.5 w-3.5" />
              Atualizações Gerenciais · Central de Demandas e Projetos Operacionais
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mt-3">
              {isManagerView ? 'Painel Gerencial de Atualizações' : 'Minhas Atualizações Gerenciais'}
            </h1>
            <p className="text-primary-foreground/85 text-sm mt-1 max-w-2xl">
              {isManagerView
                ? 'Acompanhe as demandas e projetos conduzidos pelos gestores, cobre evolução e mantenha a diretoria informada.'
                : 'Mantenha o Gerente Geral informado sobre o andamento das suas demandas e projetos.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <ManagerSummaryDialog
              buildSummary={() => buildGeneralSummary(all)}
              rows={all}
              triggerVariant="secondary"
              triggerClassName="bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground border-primary-foreground/30 backdrop-blur"
              triggerLabel="Gerar resumo para diretoria"
            />

            <Button asChild size="lg" variant="secondary" className="shadow">
              <Link to="/demandas/nova"><Plus className="h-4 w-4 mr-1" /> Nova atualização</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={ListChecks} label="Total de atualizações" value={stats.total} color="slate" />
        <KpiCard icon={Briefcase} label="Em andamento" value={stats.andamento} color="emerald" />
        <KpiCard icon={Clock} label="Aguardando decisão" value={stats.aguardando} color="amber" />
        <KpiCard icon={AlertTriangle} label="Atrasadas" value={stats.atrasadas} color="rose" />
        <KpiCard icon={Flame} label="Urgentes" value={stats.urgentes} color="orange" />
        <KpiCard icon={CheckCircle2} label="Concluídas no mês" value={stats.concluidasMes} color="green" />
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <Input
            placeholder="Buscar por demanda, projeto ou unidade…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:col-span-2"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {DEMAND_STATUS.map((s) => <SelectItem key={s} value={s}>{DEMAND_STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
            <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              {DEMAND_PRIORITY.map((p) => <SelectItem key={p} value={p}>{DEMAND_PRIORITY_LABEL[p]}</SelectItem>)}
            </SelectContent>
          </Select>
          {isManagerView && (
            <Select value={gestorFilter} onValueChange={setGestorFilter}>
              <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                {gestores.map((g) => <SelectItem key={g.id} value={g.id}>{g.full_name ?? g.email}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
            <SelectTrigger><SelectValue placeholder="Unidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as unidades</SelectItem>
              {unidades.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end pt-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/demandas/lista">Ver demandas em andamento <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
      </Card>

      {/* Listas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DemandList title="Atualizações recentes" empty={isLoading ? 'Carregando…' : 'Sem atualizações.'} items={recentes} />
        <DemandList title="Próximas do prazo" empty="Sem prazos próximos." items={proximas} showDeadline />
        <DemandList title="Demandas atrasadas" empty="Nenhuma demanda atrasada." items={atrasadas} highlight />
      </div>
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

function DemandList({
  title, items, empty, highlight, showDeadline,
}: { title: string; items: OperationalDemand[]; empty: string; highlight?: boolean; showDeadline?: boolean }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((d) => (
            <li key={d.id}>
              <Link
                to={`/demandas/${d.id}`}
                className={`block rounded-lg border p-3 hover:bg-muted/40 transition ${highlight ? 'border-rose-200 bg-rose-50/30' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-muted-foreground">{d.code}</div>
                    <div className="font-medium text-sm truncate">{d.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">{d.unidade}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <DemandStatusBadge status={d.status} />
                    <DemandPriorityBadge priority={d.prioridade} />
                  </div>
                </div>
                {showDeadline && d.prazo_estimado && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Prazo: {format(new Date(d.prazo_estimado), 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
