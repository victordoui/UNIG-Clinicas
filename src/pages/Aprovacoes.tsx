import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApprovalRequests } from '@/hooks/useApprovalWorkflow';
import { useCIList } from '@/hooks/useCI';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Inbox, Clock, CheckCircle2, XCircle, ArrowRight, Settings, UserCog,
  FileSignature, PackageCheck, Search, ShoppingCart, FileText, Hourglass, Filter,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { CIStatusBadge } from '@/components/ci/CIStatusBadge';
import { cn } from '@/lib/utils';

const statusBadge: Record<string, { label: string; variant: any }> = {
  pendente: { label: 'Pendente', variant: 'default' },
  aprovado: { label: 'Aprovado', variant: 'secondary' },
  rejeitado: { label: 'Rejeitado', variant: 'destructive' },
  cancelado: { label: 'Cancelado', variant: 'outline' },
  escalonado: { label: 'Escalonado', variant: 'default' },
};

type TypeFilter = 'todos' | 'ci' | 'compra';

export default function Aprovacoes() {
  const [tab, setTab] = useState<'pending_for_me' | 'mine' | 'all'>('pending_for_me');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');

  const { data, isLoading } = useApprovalRequests(tab);
  const { currentRole, unigRole, isSuperAdmin } = useAuth();
  const isAdmin = unigRole === 'administrador' || unigRole === 'coordenador_operacoes' || unigRole === 'gerente_geral' || isSuperAdmin;
  const { data: allCIs } = useCIList();

  const pendingCIs = useMemo(
    () => (allCIs ?? []).filter(c =>
      ['recebida', 'em_analise', 'aguardando_aprovacao'].includes(c.status as any),
    ),
    [allCIs],
  );

  const approvedToday = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return (allCIs ?? []).filter(
      (c: any) => c.status === 'aprovada' && c.updated_at && new Date(c.updated_at) >= start,
    ).length;
  }, [allCIs]);

  const term = search.trim().toLowerCase();
  const filteredCIs = pendingCIs.filter((c: any) =>
    !term
    || c.protocol?.toLowerCase().includes(term)
    || c.subject?.toLowerCase().includes(term)
    || c.requester_name?.toLowerCase().includes(term),
  );
  const filteredApprovals = (data ?? []).filter((r: any) =>
    !term
    || r.referencia_tipo?.toLowerCase().includes(term)
    || String(r.valor ?? '').includes(term),
  );

  const showCI = typeFilter === 'todos' || typeFilter === 'ci';
  const showCompra = typeFilter === 'todos' || typeFilter === 'compra';

  const totalPending = pendingCIs.length + (data?.length ?? 0);

  return (
    <MainLayout>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 pb-2 border-b border-slate-200">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <PackageCheck className="h-6 w-6 text-blue-600" />
              Aprovações
            </h1>
            <p className="text-sm text-slate-500">
              Centralize aqui as decisões de CIs e compras que dependem de você.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Button asChild variant="outline" size="sm">
                <Link to="/configuracoes/aprovacoes"><Settings className="h-4 w-4 mr-2" />Fluxos</Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link to="/configuracoes/delegacoes"><UserCog className="h-4 w-4 mr-2" />Delegações</Link>
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard icon={Hourglass} label="Pendentes para mim" value={totalPending} tone="blue" />
          <StatCard icon={FileSignature} label="CIs aguardando aprovação" value={pendingCIs.length} tone="amber" />
          <StatCard icon={ShoppingCart} label="Solicitações de compra" value={data?.length ?? 0} tone="indigo" />
          <StatCard icon={CheckCircle2} label="Aprovadas hoje" value={approvedToday} tone="emerald" />
        </div>

        {/* Search + type filter */}
        <Card className="rounded-2xl border-slate-200/80 shadow-sm p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por protocolo, assunto ou solicitante"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="h-4 w-4 text-slate-400" />
              {([
                { id: 'todos', label: 'Todos' },
                { id: 'ci', label: 'CIs' },
                { id: 'compra', label: 'Compras' },
              ] as { id: TypeFilter; label: string }[]).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTypeFilter(f.id)}
                  className={cn(
                    'h-9 rounded-md border px-3 text-xs font-semibold transition-colors',
                    typeFilter === f.id
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="w-full md:w-auto overflow-x-auto flex-nowrap whitespace-nowrap justify-start">
              <TabsTrigger value="pending_for_me" className="gap-2">
                <Hourglass className="h-3.5 w-3.5" />
                Pendentes para mim
                {totalPending > 0 && (
                  <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">{totalPending}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="mine" className="gap-2">
                <FileText className="h-3.5 w-3.5" />
                Minhas solicitações
              </TabsTrigger>
              {(isAdmin || currentRole === 'gerente') && (
                <TabsTrigger value="all" className="gap-2">
                  <Inbox className="h-3.5 w-3.5" />
                  Todas
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value={tab} className="mt-4 space-y-5">
              {/* CIs section */}
              {showCI && filteredCIs.length > 0 && (
                <section className="space-y-2">
                  <SectionHeader
                    icon={FileSignature}
                    title="CIs aguardando aprovação"
                    count={filteredCIs.length}
                    description="CIs que precisam da sua aprovação para seguir o fluxo."
                  />
                  <div className="grid gap-2">
                    {filteredCIs.map((c: any) => (
                      <Link key={c.id} to={`/dashboard/ci/${c.id}`}>
                        <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                          <CardContent className="p-4 flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant="outline">CI</Badge>
                                <span className="font-mono text-xs text-primary">{c.protocol}</span>
                                <CIStatusBadge status={c.status} />
                              </div>
                              <div className="text-sm truncate font-medium">{c.subject}</div>
                              <div className="text-xs text-muted-foreground">
                                {c.requester_name} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Compras section */}
              {showCompra && filteredApprovals.length > 0 && (
                <section className="space-y-2">
                  <SectionHeader
                    icon={ShoppingCart}
                    title="Solicitações de compra"
                    count={filteredApprovals.length}
                    description="Pedidos e solicitações de compra no fluxo de aprovação."
                  />
                  <div className="grid gap-3">
                    {filteredApprovals.map((req: any) => {
                      const stepAtual = req.approval_request_steps?.find((s: any) => s.status === 'pendente');
                      const badge = statusBadge[req.status] || statusBadge.pendente;
                      return (
                        <Link key={req.id} to={`/aprovacoes/${req.id}`}>
                          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between flex-wrap gap-2">
                                <div>
                                  <CardTitle className="text-base flex items-center gap-2">
                                    {req.referencia_tipo === 'purchase_request' ? 'Solicitação' : 'Pedido'}
                                    <Badge variant={badge.variant}>{badge.label}</Badge>
                                  </CardTitle>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Iniciado {formatDistanceToNow(new Date(req.iniciado_em), { addSuffix: true, locale: ptBR })}
                                  </p>
                                </div>
                                {req.valor != null && (
                                  <div className="text-right">
                                    <p className="text-lg font-bold">
                                      {Number(req.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="text-sm">
                                  {stepAtual ? (
                                    <span className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-amber-500" />
                                      Aguardando: <strong>{stepAtual.nome}</strong>
                                      {stepAtual.prazo_em && (
                                        <span className="text-xs text-muted-foreground">
                                          (prazo {formatDistanceToNow(new Date(stepAtual.prazo_em), { addSuffix: true, locale: ptBR })})
                                        </span>
                                      )}
                                    </span>
                                  ) : req.status === 'aprovado' ? (
                                    <span className="flex items-center gap-2 text-green-600">
                                      <CheckCircle2 className="h-4 w-4" /> Concluído
                                    </span>
                                  ) : req.status === 'rejeitado' ? (
                                    <span className="flex items-center gap-2 text-destructive">
                                      <XCircle className="h-4 w-4" /> Rejeitado
                                    </span>
                                  ) : null}
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Loading / empty */}
              {isLoading ? (
                <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando…</CardContent></Card>
              ) : (
                (showCI ? filteredCIs.length : 0) + (showCompra ? filteredApprovals.length : 0) === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center space-y-3">
                      <div className="mx-auto h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
                        <CheckCircle2 className="h-7 w-7 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Nada por aqui</p>
                        <p className="text-sm text-muted-foreground">
                          {term ? 'Nenhum item corresponde à busca.' : 'Você está em dia com as aprovações.'}
                        </p>
                      </div>
                      <div className="flex justify-center gap-2 pt-2">
                        <Button asChild size="sm" variant="outline">
                          <Link to="/dashboard/ci">Ver todas as CIs</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </MainLayout>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: 'blue' | 'amber' | 'emerald' | 'indigo' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
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

function SectionHeader({ icon: Icon, title, count, description }: { icon: any; title: string; count: number; description: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Icon className="h-4 w-4 text-blue-600" />
          {title}
          <Badge variant="secondary" className="ml-1">{count}</Badge>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}
