import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCouncilProposals, useCouncilMembers, type CouncilStatus } from '@/hooks/useCouncil';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatBRL } from '@/lib/purchaseLabels';
import {
  ArrowLeft, ArrowRight, CheckCircle2, XCircle, Clock, FileText,
  TrendingDown, Trophy, Timer, Sparkles, Users, Plus, History,
  Vote, Gavel, Medal,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  LineChart, Line, AreaChart, Area,
} from 'recharts';
import { cn } from '@/lib/utils';
import { differenceInHours, format, startOfWeek, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function useAllQuotes(ids: string[]) {
  const key = ids.slice().sort().join(',');
  return useQuery({
    queryKey: ['council_quotes_dashboard', key],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('council_proposal_quotes' as any)
        .select('proposal_id, fornecedor, total')
        .in('proposal_id', ids);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ proposal_id: string; fornecedor: string; total: number }>;
    },
  });
}

const statusMeta: Record<CouncilStatus, { label: string; tone: string; dot: string }> = {
  rascunho: { label: 'Rascunho', tone: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
  em_votacao: { label: 'Em votação', tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  aprovada: { label: 'Aprovada', tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  reprovada: { label: 'Reprovada', tone: 'bg-destructive/15 text-destructive', dot: 'bg-destructive' },
  retirada: { label: 'Retirada', tone: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
};

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  tone?: 'primary' | 'emerald' | 'amber' | 'destructive' | 'muted';
  trend?: number[];
}

const toneStyles: Record<NonNullable<KpiCardProps['tone']>, { icon: string; bar: string }> = {
  primary: { icon: 'bg-primary/10 text-primary', bar: 'hsl(var(--primary))' },
  emerald: { icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', bar: 'hsl(160 70% 45%)' },
  amber: { icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', bar: 'hsl(38 92% 50%)' },
  destructive: { icon: 'bg-destructive/10 text-destructive', bar: 'hsl(var(--destructive))' },
  muted: { icon: 'bg-muted text-muted-foreground', bar: 'hsl(var(--muted-foreground))' },
};

function KpiCard({ icon: Icon, label, value, hint, tone = 'primary', trend }: KpiCardProps) {
  const t = toneStyles[tone];
  const trendData = trend && trend.length > 0 ? trend.map((v, i) => ({ i, v })) : null;
  return (
    <div className="group relative rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/40 overflow-hidden animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', t.icon)}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
        {trendData && (
          <div className="h-10 w-20 sm:w-24 opacity-80 group-hover:opacity-100 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                <defs>
                  <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={t.bar} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={t.bar} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={t.bar} strokeWidth={2} fill={`url(#grad-${label})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-foreground leading-tight mt-1 truncate">
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>}
      </div>
    </div>
  );
}

export default function ConselhoDashboard() {
  const { data: proposals = [], isLoading } = useCouncilProposals('all');
  const { data: members = [] } = useCouncilMembers();
  const ids = useMemo(() => proposals.map(p => p.id), [proposals]);
  const { data: quotes = [] } = useAllQuotes(ids);

  const bestByProposal = useMemo(() => {
    const m: Record<string, { fornecedor: string; total: number }> = {};
    for (const q of quotes) {
      const t = Number(q.total);
      if (!Number.isFinite(t)) continue;
      if (!m[q.proposal_id] || t < m[q.proposal_id].total) {
        m[q.proposal_id] = { fornecedor: q.fornecedor, total: t };
      }
    }
    return m;
  }, [quotes]);

  const maxByProposal = useMemo(() => {
    const m: Record<string, number> = {};
    for (const q of quotes) {
      const t = Number(q.total);
      if (!Number.isFinite(t)) continue;
      if (!m[q.proposal_id] || t > m[q.proposal_id]) m[q.proposal_id] = t;
    }
    return m;
  }, [quotes]);

  const counts = useMemo(() => {
    const byStatus: Record<CouncilStatus, number> = {
      rascunho: 0, em_votacao: 0, aprovada: 0, reprovada: 0, retirada: 0,
    };
    for (const p of proposals) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    return byStatus;
  }, [proposals]);

  const aprovadas = useMemo(() => proposals.filter(p => p.status === 'aprovada'), [proposals]);
  const decididas = useMemo(() => proposals.filter(p => p.decidido_em), [proposals]);

  const valorAprovado = useMemo(() =>
    aprovadas.reduce((acc, p) => acc + (bestByProposal[p.id]?.total ?? 0), 0),
    [aprovadas, bestByProposal]
  );

  const economiaTotal = useMemo(() => aprovadas.reduce((acc, p) => {
    const min = bestByProposal[p.id]?.total ?? 0;
    const max = maxByProposal[p.id] ?? 0;
    return acc + Math.max(0, max - min);
  }, 0), [aprovadas, bestByProposal, maxByProposal]);

  const economiaPctMedia = useMemo(() => {
    const pcts: number[] = [];
    for (const p of aprovadas) {
      const min = bestByProposal[p.id]?.total ?? 0;
      const max = maxByProposal[p.id] ?? 0;
      if (max > 0 && min > 0 && max !== min) pcts.push(((max - min) / max) * 100);
    }
    if (pcts.length === 0) return 0;
    return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  }, [aprovadas, bestByProposal, maxByProposal]);

  const tempoMedioH = useMemo(() => {
    if (decididas.length === 0) return null;
    const horas = decididas.map(p => differenceInHours(new Date(p.decidido_em!), new Date(p.created_at)));
    return Math.round(horas.reduce((a, b) => a + b, 0) / decididas.length);
  }, [decididas]);

  const taxaAprovacao = useMemo(() => {
    if (decididas.length === 0) return 0;
    return Math.round((counts.aprovada / decididas.length) * 100);
  }, [counts.aprovada, decididas.length]);

  // Sparkline 12 semanas: nº propostas criadas por semana
  const semanas = useMemo(() => {
    const buckets: { label: string; v: number; valor: number }[] = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const start = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
      const end = startOfWeek(subWeeks(today, i - 1), { weekStartsOn: 1 });
      const inWeek = proposals.filter(p => {
        const d = new Date(p.created_at);
        return d >= start && d < end;
      });
      const valor = inWeek
        .filter(p => p.status === 'aprovada')
        .reduce((a, p) => a + (bestByProposal[p.id]?.total ?? 0), 0);
      buckets.push({ label: format(start, 'dd/MM'), v: inWeek.length, valor });
    }
    return buckets;
  }, [proposals, bestByProposal]);

  const sparkPropostas = semanas.map(s => s.v);
  const sparkValor = semanas.map(s => s.valor);

  const statusData = useMemo(() => ([
    { name: 'Rascunho', value: counts.rascunho, color: 'hsl(var(--muted-foreground))' },
    { name: 'Em votação', value: counts.em_votacao, color: 'hsl(38 92% 50%)' },
    { name: 'Aprovadas', value: counts.aprovada, color: 'hsl(160 70% 45%)' },
    { name: 'Reprovadas', value: counts.reprovada, color: 'hsl(var(--destructive))' },
    { name: 'Retiradas', value: counts.retirada, color: 'hsl(var(--muted-foreground))' },
  ]), [counts]);

  const topFornecedores = useMemo(() => {
    const m: Record<string, { count: number; total: number }> = {};
    for (const p of aprovadas) {
      const b = bestByProposal[p.id];
      if (!b) continue;
      if (!m[b.fornecedor]) m[b.fornecedor] = { count: 0, total: 0 };
      m[b.fornecedor].count += 1;
      m[b.fornecedor].total += b.total;
    }
    return Object.entries(m)
      .map(([fornecedor, v]) => ({ fornecedor, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [aprovadas, bestByProposal]);

  const maxFornecedorTotal = topFornecedores[0]?.total ?? 0;

  const ultimasDecisoes = useMemo(() =>
    [...decididas]
      .sort((a, b) => new Date(b.decidido_em!).getTime() - new Date(a.decidido_em!).getTime())
      .slice(0, 6),
    [decididas]
  );

  const total = proposals.length;

  return (
    <MainLayout>
      <div className="min-h-full -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 pb-24 animate-fade-in">
        <div className="max-w-6xl mx-auto space-y-5 pt-1">
          {/* Back */}
          <div className="flex items-center justify-between -mx-1">
            <Link
              to="/conselho"
              className="inline-flex items-center gap-1 text-primary text-[15px] font-semibold px-1 active:opacity-60 hover:opacity-80 transition-opacity"
            >
              <ArrowLeft className="h-5 w-5" /> Conselho
            </Link>
          </div>

          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground p-5 sm:p-7 shadow-lg">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/30 blur-3xl" />
              <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
            </div>
            <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" /> Conselho deliberativo
                </div>
                <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                  Dashboard
                </h1>
                <p className="mt-2 text-sm sm:text-base text-primary-foreground/85 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> {members.length} conselheiros</span>
                  <span className="hidden sm:inline opacity-50">·</span>
                  <span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4" /> {total} propostas</span>
                  <span className="hidden sm:inline opacity-50">·</span>
                  <span className="inline-flex items-center gap-1.5"><Gavel className="h-4 w-4" /> {taxaAprovacao}% de aprovação</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/conselho/historico"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur px-3.5 py-2 text-sm font-semibold transition-colors"
                >
                  <History className="h-4 w-4" /> Histórico
                </Link>
                <Link
                  to="/conselho/nova"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-background text-primary hover:bg-background/90 px-4 py-2 text-sm font-bold shadow-md transition-colors"
                >
                  <Plus className="h-4 w-4" /> Nova proposta
                </Link>
              </div>
            </div>
          </section>

          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : total === 0 ? (
            <EmptyState icon={FileText} title="Sem dados" description="Ainda não há propostas para gerar métricas." />
          ) : (
            <>
              {/* KPIs principais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <KpiCard
                  icon={TrendingDown}
                  label="Valor aprovado"
                  value={formatBRL(valorAprovado)}
                  hint={`${aprovadas.length} ${aprovadas.length === 1 ? 'proposta aprovada' : 'propostas aprovadas'}`}
                  tone="primary"
                  trend={sparkValor}
                />
                <KpiCard
                  icon={Sparkles}
                  label="Economia total"
                  value={formatBRL(economiaTotal)}
                  hint={economiaPctMedia > 0 ? `Média ${economiaPctMedia}% por proposta` : 'Comparando melhor vs. pior cotação'}
                  tone="emerald"
                />
                <KpiCard
                  icon={Timer}
                  label="Tempo médio de decisão"
                  value={tempoMedioH !== null ? `${tempoMedioH}h` : '—'}
                  hint={decididas.length > 0 ? `${decididas.length} ${decididas.length === 1 ? 'proposta decidida' : 'propostas decididas'}` : 'Sem decisões ainda'}
                  tone="amber"
                />
              </div>

              {/* KPIs status */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <KpiCard icon={FileText} label="Propostas" value={String(total)} tone="primary" trend={sparkPropostas} />
                <KpiCard icon={Vote} label="Em votação" value={String(counts.em_votacao)} tone="amber" hint="aguardando decisão" />
                <KpiCard icon={CheckCircle2} label="Aprovadas" value={String(counts.aprovada)} tone="emerald" hint={`${taxaAprovacao}% das decididas`} />
                <KpiCard icon={XCircle} label="Reprovadas" value={String(counts.reprovada)} tone="destructive" />
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Distribuição por status */}
                <section className="lg:col-span-3 rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold text-foreground">Distribuição por status</h2>
                    <span className="text-xs text-muted-foreground">{total} propostas</span>
                  </div>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 12,
                            fontSize: 12,
                          }}
                          cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                        />
                        <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={56}>
                          {statusData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* Tendência semanal */}
                <section className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold text-foreground">Tendência (12 sem.)</h2>
                    <span className="text-xs text-muted-foreground">propostas criadas</span>
                  </div>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={semanas} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} interval={1} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 12,
                            fontSize: 12,
                          }}
                        />
                        <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--primary))' }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>

              {/* Ranking + Últimas decisões */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm animate-fade-in">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="h-4.5 w-4.5 text-amber-500" />
                    <h2 className="text-base font-bold text-foreground">Fornecedores vencedores</h2>
                  </div>
                  {topFornecedores.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum fornecedor vencedor ainda.</p>
                  ) : (
                    <ul className="space-y-3">
                      {topFornecedores.map((f, i) => {
                        const pct = maxFornecedorTotal > 0 ? (f.total / maxFornecedorTotal) * 100 : 0;
                        const medalColor = i === 0
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          : i === 1
                          ? 'bg-slate-400/20 text-slate-600 dark:text-slate-300'
                          : i === 2
                          ? 'bg-orange-700/20 text-orange-700 dark:text-orange-400'
                          : 'bg-muted text-muted-foreground';
                        return (
                          <li key={f.fornecedor} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={cn('inline-flex h-7 w-7 rounded-full items-center justify-center text-xs font-bold shrink-0', medalColor)}>
                                  {i < 3 ? <Medal className="h-3.5 w-3.5" /> : i + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">{f.fornecedor}</p>
                                  <p className="text-[11px] text-muted-foreground">{f.count} {f.count === 1 ? 'proposta' : 'propostas'}</p>
                                </div>
                              </div>
                              <p className="text-sm font-extrabold tabular-nums text-foreground shrink-0">{formatBRL(f.total)}</p>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4.5 w-4.5 text-primary" />
                      <h2 className="text-base font-bold text-foreground">Últimas decisões</h2>
                    </div>
                    <Link to="/conselho/historico" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                      Ver tudo <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  {ultimasDecisoes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma decisão registrada ainda.</p>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {ultimasDecisoes.map((p) => {
                        const meta = statusMeta[p.status];
                        const best = bestByProposal[p.id];
                        return (
                          <li key={p.id}>
                            <Link
                              to={`/conselho/${p.id}`}
                              className="flex items-center justify-between gap-3 py-3 group hover:bg-muted/40 -mx-2 px-2 rounded-lg transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', meta.tone)}>
                                    <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                                    {meta.label}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {format(new Date(p.decidido_em!), "dd 'de' MMM", { locale: ptBR })}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                  {p.titulo}
                                </p>
                                {best && (
                                  <p className="text-[11px] text-muted-foreground truncate">{best.fornecedor}</p>
                                )}
                              </div>
                              {best && (
                                <p className="text-sm font-bold tabular-nums text-foreground shrink-0">
                                  {formatBRL(best.total)}
                                </p>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
