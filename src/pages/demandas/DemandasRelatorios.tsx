import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
  useOperationalDemands, useOrgGestores, useMarkOverdueDemands,
  DEMAND_STATUS, DEMAND_STATUS_LABEL, OperationalDemand, isOverdue, FINAL_STATUSES,
} from '@/hooks/useOperationalDemands';
import { exportDemandsToExcel, exportDemandsToPDF } from '@/lib/demandsExport';
import { ManagerSummaryDialog } from '@/components/demandas/ManagerSummaryDialog';
import { buildGeneralSummary } from '@/lib/demandSummary';
import { Briefcase, FileDown, FileSpreadsheet, RefreshCw, X, CalendarRange } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function DemandasRelatorios() {
  const { data: all = [], isLoading } = useOperationalDemands();
  const { data: gestores = [] } = useOrgGestores();
  const markOverdue = useMarkOverdueDemands();

  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth] = useState<string>(defaultMonth);
  const [unidade, setUnidade] = useState<string>('');
  const [gestorId, setGestorId] = useState<string>('');
  const [statusSel, setStatusSel] = useState<string[]>([]);

  const unidades = useMemo(() => Array.from(new Set(all.map((d) => d.unidade).filter(Boolean))).sort(), [all]);

  const inMonth = (d: OperationalDemand) => {
    if (!month) return true;
    const dt = new Date(d.updated_at);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    return key === month;
  };
  const openedInMonth = (d: OperationalDemand) => {
    if (!month) return true;
    const dt = new Date(d.created_at);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}` === month;
  };
  const concludedInMonth = (d: OperationalDemand) => {
    if (d.status !== 'concluida') return false;
    const ref = d.concluida_em ?? d.updated_at;
    const dt = new Date(ref);
    return !month || `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}` === month;
  };

  const data = useMemo(() => {
    return all.filter((d) => {
      if (unidade && d.unidade !== unidade) return false;
      if (gestorId && d.gestor_responsavel !== gestorId) return false;
      if (statusSel.length && !statusSel.includes(d.status)) return false;
      if (month && !inMonth(d)) return false;
      return true;
    });
  }, [all, unidade, gestorId, statusSel, month]);

  const gestorNome = gestores.find((g: any) => g.id === gestorId)?.full_name ?? '';

  const porStatus = useMemo(() => {
    const map = new Map<string, number>();
    DEMAND_STATUS.forEach((s) => map.set(s, 0));
    data.forEach((d) => map.set(d.status, (map.get(d.status) ?? 0) + 1));
    return Array.from(map.entries());
  }, [data]);

  const porUnidade = useMemo(() => groupCount(data, (d) => d.unidade || '—'), [data]);
  const porGestor = useMemo(() => groupCount(data, (d) => d.gestor?.full_name ?? '—'), [data]);

  function toggleStatus(s: string) {
    setStatusSel((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  }

  function clearFilters() {
    setUnidade(''); setGestorId(''); setStatusSel([]); setMonth(defaultMonth);
  }

  async function runOverdue() {
    const n = await markOverdue.mutateAsync();
    toast({ title: `Atualização concluída`, description: `${n ?? 0} demanda(s) marcada(s) como atrasada(s).` });
  }

  const filters = { unidade, gestorNome, status: statusSel, month };

  // KPIs do mês consolidado
  const abertasMes = all.filter(openedInMonth).length;
  const concluidasMes = all.filter(concludedInMonth).length;
  const emAndamento = data.filter((d) => d.status === 'em_execucao').length;
  const atrasadasMes = data.filter(isOverdue).length;
  const urgentesMes = data.filter((d) => d.prioridade === 'urgente' && !FINAL_STATUSES.includes(d.status)).length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Briefcase className="h-4 w-4" /> Atualizações Gerenciais
          </div>
          <h1 className="text-2xl font-bold">Relatório Mensal</h1>
          <p className="text-sm text-muted-foreground">Consolidado mensal para acompanhamento do Gerente Geral e reuniões com a diretoria.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ManagerSummaryDialog
            buildSummary={() => buildGeneralSummary(data, month ? new Date(`${month}-01T00:00:00`) : undefined)}
            rows={data}
            triggerLabel="Gerar resumo para diretoria"
          />

          <Button variant="outline" size="sm" onClick={runOverdue} disabled={markOverdue.isPending}>
            <RefreshCw className={`h-4 w-4 mr-1 ${markOverdue.isPending ? 'animate-spin' : ''}`} /> Recalcular atrasadas
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportDemandsToExcel(data, filters)} disabled={!data.length}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button size="sm" onClick={() => exportDemandsToPDF(data, filters)} disabled={!data.length}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* KPI mensal */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KV k="Abertas no mês" v={abertasMes} />
        <KV k="Concluídas no mês" v={concluidasMes} />
        <KV k="Em andamento" v={emAndamento} />
        <KV k="Atrasadas" v={atrasadasMes} />
        <KV k="Urgentes" v={urgentesMes} />
      </div>

      {/* Filtros */}
      <Card className="p-4 space-y-3">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><CalendarRange className="h-3 w-3" /> Mês</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Unidade</Label>
            <Select value={unidade || '__all__'} onValueChange={(v) => setUnidade(v === '__all__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {unidades.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Gestor</Label>
            <Select value={gestorId || '__all__'} onValueChange={(v) => setGestorId(v === '__all__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {gestores.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.full_name ?? g.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 flex flex-col">
            <Label className="text-xs">Status</Label>
            <div className="flex flex-wrap gap-1.5">
              {DEMAND_STATUS.map((s) => {
                const active = statusSel.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStatus(s)}
                    className={`text-[11px] px-2 py-1 rounded-full border transition ${
                      active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'
                    }`}
                  >
                    {DEMAND_STATUS_LABEL[s]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-muted-foreground">
            Mostrando <b>{data.length}</b> de {all.length} demandas
          </div>
          {(unidade || gestorId || statusSel.length > 0 || month !== defaultMonth) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" /> Limpar filtros
            </Button>
          )}
        </div>
      </Card>


      {isLoading && <p className="text-muted-foreground">Carregando…</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ReportCard title="Por status">
          {porStatus.map(([s, c]) => (
            <RowBar key={s} label={DEMAND_STATUS_LABEL[s as keyof typeof DEMAND_STATUS_LABEL]} value={c} max={data.length || 1} />
          ))}
        </ReportCard>
        <ReportCard title="Por unidade">
          {porUnidade.map(([u, c]) => <RowBar key={u} label={u} value={c} max={data.length || 1} />)}
          {porUnidade.length === 0 && <p className="text-xs text-muted-foreground">Sem dados.</p>}
        </ReportCard>
        <ReportCard title="Por gestor responsável">
          {porGestor.map(([u, c]) => <RowBar key={u} label={u} value={c} max={data.length || 1} />)}
          {porGestor.length === 0 && <p className="text-xs text-muted-foreground">Sem dados.</p>}
        </ReportCard>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-2">Relatório geral</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <KV k="Total filtrado" v={data.length} />
          <KV k="Concluídas" v={data.filter((d) => d.status === 'concluida').length} />
          <KV k="Em execução" v={data.filter((d) => d.status === 'em_execucao').length} />
          <KV k="Atrasadas" v={data.filter((d) => d.is_overdue).length} />
          <KV k="Canceladas" v={data.filter((d) => d.status === 'cancelada').length} />
        </div>
      </Card>
    </div>
  );
}


function groupCount(arr: OperationalDemand[], by: (d: OperationalDemand) => string) {
  const m = new Map<string, number>();
  arr.forEach((d) => { const k = by(d); m.set(k, (m.get(k) ?? 0) + 1); });
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </Card>
  );
}

function RowBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="truncate">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: number }) {
  return (
    <div className="rounded-lg border p-3 bg-muted/30">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="text-xl font-bold">{v}</div>
    </div>
  );
}
