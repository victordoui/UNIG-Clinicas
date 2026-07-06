import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertCircle, CalendarDays, CheckCircle2, ChevronRight, Clock,
  FileText, Hourglass, Plus, Printer, Search,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useCIHistory, useCIList, type CIRequest } from '@/hooks/useCI';
import { CIStatusBadge } from '@/components/ci/CIStatusBadge';
import { CI_PRIORITY_BADGE, CI_PRIORITY_LABEL, CI_STATUS_LABEL, type CIStatus } from '@/lib/ciLabels';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

const FINAL_STATUSES: CIStatus[] = ['finalizada', 'cancelada', 'reprovada', 'desaprovada_conselho'];
const WAITING_STATUSES: CIStatus[] = [
  'aguardando_aprovacao', 'aguardando_coordenador', 'aguardando_gerente',
  'aguardando_conselho', 'aguardando_validacao_tecnica', 'aguardando_validacao_regulatoria',
  'ajuste_solicitado_engenheira', 'ajuste_solicitado_regulatorio', 'revisao_solicitada',
];

const FILTERS = [
  { id: 'todas', label: 'Todas' },
  { id: 'andamento', label: 'Em andamento' },
  { id: 'aguardando', label: 'Aguardando ação' },
  { id: 'finalizadas', label: 'Finalizadas' },
] as const;

type FilterId = typeof FILTERS[number]['id'];

export default function CIPublicLookup() {
  const { data: list, isLoading } = useCIList({ mine: true });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterId>('todas');
  const minhas = list ?? [];

  const stats = useMemo(() => {
    const active = minhas.filter(c => !FINAL_STATUSES.includes(c.status)).length;
    const waiting = minhas.filter(c => WAITING_STATUSES.includes(c.status)).length;
    const done = minhas.filter(c => c.status === 'finalizada').length;
    const urgent = minhas.filter(c => c.priority === 'alta' || c.priority === 'urgente').length;
    return { active, waiting, done, urgent };
  }, [minhas]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return minhas.filter((ci) => {
      const matchesSearch = !term
        || ci.protocol?.toLowerCase().includes(term)
        || ci.subject?.toLowerCase().includes(term);
      const matchesFilter = filter === 'todas'
        || (filter === 'andamento' && !FINAL_STATUSES.includes(ci.status) && !WAITING_STATUSES.includes(ci.status))
        || (filter === 'aguardando' && WAITING_STATUSES.includes(ci.status))
        || (filter === 'finalizadas' && FINAL_STATUSES.includes(ci.status));
      return matchesSearch && matchesFilter;
    });
  }, [filter, minhas, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" /> Minhas CIs
          </h1>
          <p className="text-sm text-slate-500">Acompanhe o andamento, os status e o histórico das suas requisições.</p>
        </div>
        <Link to="/unigops/ci/formulario">
          <Button><Plus className="h-4 w-4 mr-1.5" /> Nova CI</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard icon={Clock} label="Em andamento" value={stats.active} tone="blue" />
        <SummaryCard icon={Hourglass} label="Aguardando ação" value={stats.waiting} tone="amber" />
        <SummaryCard icon={CheckCircle2} label="Finalizadas" value={stats.done} tone="emerald" />
        <SummaryCard icon={AlertCircle} label="Alta prioridade" value={stats.urgent} tone="rose" />
      </div>

      <Card className="rounded-2xl border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por protocolo ou assunto"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  'h-9 rounded-md border px-3 text-xs font-semibold transition-colors',
                  filter === item.id
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        ) : minhas.length === 0 ? (
          <EmptyState icon={Activity} title="Sem requisições" description="Você ainda não abriu nenhuma CI." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="Nenhum resultado" description="Ajuste a busca ou os filtros para localizar suas CIs." />
        ) : (
          <Accordion type="single" collapsible className="space-y-3">
            {filtered.map((ci, index) => (
              <AccordionItem
                key={ci.id}
                value={ci.id}
                className="group relative rounded-xl border border-slate-200 bg-white px-4 transition-all hover:border-blue-300 hover:shadow-md cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-center gap-2">
                  <AccordionTrigger className="flex-1 gap-3 py-4 text-left hover:no-underline [&>svg]:hidden">
                    <CIListHeader ci={ci} />
                  </AccordionTrigger>
                  <div className="ml-auto flex items-center gap-2 shrink-0">
                    {ci.protocol && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/unigops/ci/imprimir/${ci.protocol}`, '_blank');
                        }}
                        title="Imprimir CI"
                        className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Imprimir
                      </button>
                    )}
                    <AccordionTrigger
                      aria-label="Expandir CI"
                      className="shrink-0 p-0 hover:no-underline [&>svg]:hidden"
                    >
                      <div
                        aria-hidden
                        className="h-9 w-9 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-500 transition-colors group-hover:border-blue-300 group-hover:text-blue-700 group-data-[state=open]:rotate-180 group-data-[state=open]:border-blue-300 group-data-[state=open]:text-blue-700"
                      >
                        <ChevronRight className="h-4 w-4 rotate-90" />
                      </div>
                    </AccordionTrigger>
                  </div>
                </div>
                <AccordionContent className="pb-5">
                  <CITimeline ci={ci} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Card>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: 'blue' | 'amber' | 'emerald' | 'rose' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
  } as const;
  return (
    <Card className="rounded-xl border-slate-200/80 shadow-sm p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
        </div>
        <div className={cn('h-10 w-10 rounded-lg border flex items-center justify-center', tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function CIListHeader({ ci }: { ci: CIRequest }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        <FileText className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-semibold text-blue-700">{ci.protocol}</span>
          <CIStatusBadge status={ci.status} className="text-[10px]" />
          <Badge variant="outline" className={cn('text-[10px] border-0', CI_PRIORITY_BADGE[ci.priority])}>
            {CI_PRIORITY_LABEL[ci.priority]}
          </Badge>
        </div>
        <div className="text-sm font-semibold text-slate-900 truncate mt-1">{ci.subject}</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1">
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {formatDate(ci.created_at)}</span>
          {ci.destination_sector && <span>Destino: {ci.destination_sector}</span>}
        </div>
      </div>
    </div>
  );
}

function CITimeline({ ci }: { ci: CIRequest }) {
  const { data, isLoading } = useCIHistory(ci.id);
  const history = data ?? [];

  return (
    <div className="rounded-xl bg-slate-50/70 border border-slate-100 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Histórico da CI</h3>
          <p className="text-xs text-slate-500">Status atual: {CI_STATUS_LABEL[ci.status]}</p>
        </div>
        <Link to={`/dashboard/ci/${ci.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">
          Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : history.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg bg-white border border-dashed border-slate-200 p-4">
          <Clock className="h-5 w-5 text-slate-300" />
          <div>
            <p className="text-sm font-semibold text-slate-700">Sem eventos adicionais</p>
            <p className="text-xs text-slate-500">Assim que houver movimentações, elas aparecerão nesta linha do tempo.</p>
          </div>
        </div>
      ) : (
        <ol className="space-y-3">
          {history.map((event: any, index) => (
            <li key={event.id ?? index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={cn(
                  'h-7 w-7 rounded-full border flex items-center justify-center bg-white',
                  index === 0 ? 'border-blue-300 text-blue-700' : 'border-slate-200 text-slate-400',
                )}>
                  {index === history.length - 1 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                </span>
                {index < history.length - 1 && <span className="w-px flex-1 bg-slate-200 mt-1" />}
              </div>
              <div className="flex-1 rounded-lg bg-white border border-slate-100 p-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{formatEvent(event.event_type)}</p>
                    {(event.from_status || event.to_status) && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {statusLabel(event.from_status)} {event.from_status && event.to_status ? '→' : ''} {statusLabel(event.to_status)}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 tabular-nums">{formatDateTime(event.created_at)}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function statusLabel(status?: CIStatus | string | null) {
  if (!status) return '';
  return CI_STATUS_LABEL[status as CIStatus] ?? String(status).replace(/_/g, ' ');
}

function formatEvent(value?: string | null) {
  if (!value) return 'Movimentação registrada';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem data';
  return new Date(value).toLocaleDateString('pt-BR');
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sem data';
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
