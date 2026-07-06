import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCIList, type CIListFilters } from '@/hooks/useCI';
import { Card } from '@/components/ui/card';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CIStatusBadge } from '@/components/ci/CIStatusBadge';
import { CIFilters } from '@/components/ci/CIFilters';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import {
  FileText, KanbanSquare, ListChecks, Layers, Inbox, ClipboardCheck,
  ShoppingCart, ShieldAlert, Truck, CheckCircle2, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CI_CHANNEL_BADGE, CI_CHANNEL_LABEL, CI_STAGE_BADGE, CI_STAGE_LABEL,
  CI_PRIORITY_BADGE, CI_PRIORITY_LABEL,
} from '@/lib/ciLabels';

interface Props { mine?: boolean }
export default function CIDashboard({ mine }: Props) {
  const { pathname } = useLocation();
  const [filters, setFilters] = useState<CIListFilters>({ mine });
  const { data, isLoading } = useCIList(filters);

  const counts = useMemo(() => {
    const list = data ?? [];
    const isClosed = (s: string) => ['finalizada', 'cancelada', 'reprovada'].includes(s);
    return {
      total: list.length,
      abertas: list.filter(c => !isClosed(c.status)).length,
      triagem: list.filter(c => c.current_stage === 'triagem' && !isClosed(c.status)).length,
      cotacao: list.filter(c => c.current_stage === 'cotacao' || c.status === 'em_cotacao').length,
      aprovacao: list.filter(c => c.current_stage === 'aprovacao' || ['aguardando_aprovacao', 'aguardando_coordenador', 'aguardando_gerente', 'aguardando_conselho'].includes(c.status)).length,
      urgentes: list.filter(c => c.priority === 'urgente' || c.priority === 'alta').length,
      entrega: list.filter(c => c.current_stage === 'entrega' || ['pedido_emitido', 'aguardando_entrega'].includes(c.status)).length,
      finalizadas: list.filter(c => c.status === 'finalizada').length,
    };
  }, [data]);

  const title = mine
    ? 'Minhas Requisições'
    : pathname.includes('/gestao-requisicoes/painel')
      ? 'Painel Geral'
      : 'Todas as Requisições';

  type Tone = 'slate' | 'blue' | 'amber' | 'violet' | 'orange' | 'rose' | 'sky' | 'emerald';
  const TONE: Record<Tone, { bg: string; text: string; ring: string }> = {
    slate:   { bg: 'bg-slate-50',   text: 'text-slate-700',   ring: 'ring-slate-200' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'ring-blue-200' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200' },
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  ring: 'ring-violet-200' },
    orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  ring: 'ring-orange-200' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200' },
    sky:     { bg: 'bg-sky-50',     text: 'text-sky-700',     ring: 'ring-sky-200' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  };

  const cards: Array<{ key: string; label: string; value: number; icon: typeof Layers; tone: Tone; onClick: () => void }> = [
    { key: 'total',       label: 'Total',                 value: counts.total,       icon: Layers,         tone: 'slate',   onClick: () => setFilters({ mine }) },
    { key: 'abertas',     label: 'Em aberto',             value: counts.abertas,     icon: Inbox,          tone: 'blue',    onClick: () => setFilters({ mine }) },
    { key: 'triagem',     label: 'Aguardando triagem',    value: counts.triagem,     icon: ClipboardCheck, tone: 'amber',   onClick: () => setFilters({ mine, stage: 'triagem' }) },
    { key: 'cotacao',     label: 'Em cotação',            value: counts.cotacao,     icon: ShoppingCart,   tone: 'violet',  onClick: () => setFilters({ mine, stage: 'cotacao' }) },
    { key: 'aprovacao',   label: 'Aguardando aprovação',  value: counts.aprovacao,   icon: BarChart3,      tone: 'orange',  onClick: () => setFilters({ mine, stage: 'aprovacao' }) },
    { key: 'urgentes',    label: 'Alta / Urgente',        value: counts.urgentes,    icon: ShieldAlert,    tone: 'rose',    onClick: () => setFilters({ mine, urgent: true }) },
    { key: 'entrega',     label: 'Aguardando entrega',    value: counts.entrega,     icon: Truck,          tone: 'sky',     onClick: () => setFilters({ mine, stage: 'entrega' }) },
    { key: 'finalizadas', label: 'Finalizadas',           value: counts.finalizadas, icon: CheckCircle2,   tone: 'emerald', onClick: () => setFilters({ mine, status: 'finalizada' }) },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* HERO HEADER */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary via-primary to-[hsl(211_89%_38%)] text-primary-foreground shadow-lg">
          <div className="absolute inset-0 opacity-10 pointer-events-none"
               style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                <ListChecks className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
                <p className="text-sm text-primary-foreground/80 mt-1">
                  Central digital de requisições internas — acompanhe, filtre e gerencie todas as CIs da organização.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link to="/gestao-requisicoes/kanban">
                <Button variant="secondary" size="sm" className="bg-white/15 text-white border-white/20 hover:bg-white/25 backdrop-blur">
                  <KanbanSquare className="h-4 w-4 mr-2" />Kanban
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {cards.map(c => {
            const t = TONE[c.tone];
            return (
              <button
                key={c.key}
                onClick={c.onClick}
                className="group text-left rounded-xl border border-slate-200 bg-white p-3 hover:border-primary hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center ring-1', t.bg, t.text, t.ring)}>
                    <c.icon className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 tabular-nums leading-none mt-0.5">{c.value}</div>
                </div>
                <div className="text-[11px] font-medium text-slate-500 mt-2 leading-tight">{c.label}</div>
              </button>
            );
          })}
        </div>

        <CIFilters value={filters} onChange={setFilters} />

        <Card className="p-0 overflow-hidden">
          {isLoading ? <TableSkeleton rows={5} columns={8} /> : !data || data.length === 0 ? (
            <EmptyState icon={FileText} title="Nenhuma CI encontrada" description="Ajuste os filtros ou aguarde novas requisições." />
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm min-w-[1280px]">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2 whitespace-nowrap">Protocolo</th>
                    <th className="px-3 py-2 whitespace-nowrap">Assunto</th>
                    <th className="px-3 py-2 whitespace-nowrap">Solicitante</th>
                    <th className="px-3 py-2 whitespace-nowrap">Setor</th>
                    <th className="px-3 py-2 whitespace-nowrap">Campus</th>
                    <th className="px-3 py-2 whitespace-nowrap">Centro Custo</th>
                    <th className="px-3 py-2 whitespace-nowrap">Origem</th>
                    <th className="px-3 py-2 whitespace-nowrap">Estágio</th>
                    <th className="px-3 py-2 whitespace-nowrap">Prioridade</th>
                    <th className="px-3 py-2 whitespace-nowrap">Status</th>
                    <th className="px-3 py-2 whitespace-nowrap">Criada</th>
                    <th className="px-3 py-2 whitespace-nowrap">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(ci => {
                    const stage = (ci.current_stage ?? 'triagem') as keyof typeof CI_STAGE_LABEL;
                    return (
                      <tr key={ci.id} className="border-t hover:bg-muted/30 cursor-pointer">
                        <td className="px-3 py-2 font-mono whitespace-nowrap">
                          <Link className="text-primary hover:underline" to={`/dashboard/ci/${ci.id}`}>{ci.protocol}</Link>
                        </td>
                        <td className="px-3 py-2 max-w-[260px] truncate" title={ci.subject}>{ci.subject}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{ci.requester_name}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{ci.destination_sector ?? ci.requester_sector ?? '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{ci.campus ?? '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate" title={ci.cost_center ?? ''}>{ci.cost_center ?? '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <Badge variant="outline" className={CI_CHANNEL_BADGE[ci.channel]}>
                            {CI_CHANNEL_LABEL[ci.channel]}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <Badge variant="outline" className={CI_STAGE_BADGE[stage] ?? ''}>
                            {CI_STAGE_LABEL[stage] ?? stage}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <Badge variant="outline" className={CI_PRIORITY_BADGE[ci.priority]}>
                            {CI_PRIORITY_LABEL[ci.priority]}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap"><CIStatusBadge status={ci.status} /></td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{new Date(ci.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{ci.due_date ? new Date(ci.due_date).toLocaleDateString('pt-BR') : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
