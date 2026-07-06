import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Briefcase, Package, FileSignature, Truck, AlertTriangle, Banknote, ClipboardList, Search, ChevronRight, Building2, Inbox } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBuyerPanel } from '@/hooks/useBuyerPanel';
import { useOrgBuyers } from '@/hooks/useCI';
import { useMyCostCenters } from '@/hooks/useUserCostCenters';
import { canSeeAllCostCenters } from '@/lib/ccVisibility';
import { formatBRL, PRIORITY_LABEL, PRIORITY_BADGE } from '@/lib/purchaseLabels';
import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE } from '@/hooks/usePurchaseOrders';
import { CI_STATUS_LABEL, CI_STATUS_BADGE, CI_PRIORITY_LABEL, CI_PRIORITY_BADGE } from '@/lib/ciLabels';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ALLOWED = new Set(['super_admin', 'administrador', 'coordenador_operacoes', 'gerente_geral', 'compras', 'gestor_aprovador']);

export default function PainelComprador() {
  const { unigRole, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [ccFilter, setCcFilter] = useState<string>('all');
  const [buyerFilter, setBuyerFilter] = useState<string>('team');
  const { data: myCCs = [] } = useMyCostCenters();
  const { data: buyers = [] } = useOrgBuyers();
  const isManager = isSuperAdmin || ['administrador', 'coordenador_operacoes', 'gerente_geral'].includes(unigRole);

  const { kpis, approvedQueue, openQuotes, pendingReceipts, lateSuppliers, myAssignedCIs } = useBuyerPanel(ccFilter, buyerFilter);

  const ccOptions = canSeeAllCostCenters(unigRole)
    ? myCCs.map(c => ({ id: c.id, nome: c.nome }))
    : myCCs.map(c => ({ id: c.id, nome: c.nome }));

  if (!isSuperAdmin && !ALLOWED.has(unigRole)) return <Navigate to="/dashboard" replace />;

  const slaBadge = (d: number) => {
    if (d <= 2) return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
    if (d <= 5) return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
    return 'bg-red-500/15 text-red-700 border-red-500/30';
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" /> Painel do Comprador
            </h1>
            <p className="text-muted-foreground">Centro de operações do setor de Compras</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isManager && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Comprador</Label>
                <Select value={buyerFilter} onValueChange={setBuyerFilter}>
                  <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">Visão da equipe</SelectItem>
                    {buyers.filter((buyer) => buyer.role === 'compras').map((buyer) => (
                      <SelectItem key={buyer.user_id} value={buyer.user_id}>{buyer.full_name || buyer.email || 'Comprador'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {ccOptions.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Centro de Custo</Label>
                <Select value={ccFilter} onValueChange={setCcFilter}>
                  <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {ccOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={<Inbox className="h-4 w-4 text-primary" />} label={isManager && buyerFilter === 'team' ? 'CIs da equipe' : 'Minhas CIs'} value={kpis.myCIs} loading={myAssignedCIs.isLoading} />
          <KpiCard icon={<Package className="h-4 w-4" />} label="Aprovadas s/ pedido" value={kpis.approvedNoOrder} loading={approvedQueue.isLoading} />
          <KpiCard icon={<Search className="h-4 w-4" />} label="Cotações em aberto" value={kpis.openQuotes} loading={openQuotes.isLoading} />
          <KpiCard icon={<FileSignature className="h-4 w-4" />} label="Pedidos em aberto" value={kpis.openOrders} loading={pendingReceipts.isLoading} />
          <KpiCard icon={<AlertTriangle className="h-4 w-4 text-red-500" />} label="Atrasados" value={kpis.lateOrders} loading={pendingReceipts.isLoading} />
          <KpiCard icon={<Banknote className="h-4 w-4" />} label="Valor em aberto" value={formatBRL(kpis.openValue)} loading={pendingReceipts.isLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My assigned CIs */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Inbox className="h-4 w-4 text-primary" /> {isManager && buyerFilter === 'team' ? 'CIs atribuídas à equipe' : 'Minhas CIs atribuídas'}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {myAssignedCIs.isLoading ? (
                <div className="p-4"><TableSkeleton rows={4} columns={5} /></div>
              ) : (myAssignedCIs.data ?? []).length === 0 ? (
                <EmptyState icon={Inbox} title="Nenhuma CI atribuída" description="Você não possui CIs atribuídas no momento." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Atribuída em</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(myAssignedCIs.data ?? []).slice(0, 15).map(ci => (
                      <TableRow key={ci.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/dashboard/ci/${ci.id}`)}>
                        <TableCell className="font-mono text-xs">{ci.protocol}</TableCell>
                        <TableCell className="max-w-[280px] truncate">{ci.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={CI_PRIORITY_BADGE[ci.priority]}>{CI_PRIORITY_LABEL[ci.priority]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={CI_STATUS_BADGE[ci.status]}>{CI_STATUS_LABEL[ci.status]}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(ci.updated_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Approved queue */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Fila de Requisições Aprovadas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {approvedQueue.isLoading ? (
                <div className="p-4"><TableSkeleton rows={4} columns={5} /></div>
              ) : (approvedQueue.data ?? []).length === 0 ? (
                <EmptyState icon={ClipboardList} title="Tudo em dia" description="Nenhuma requisição aprovada aguardando cotação." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(approvedQueue.data ?? []).slice(0, 10).map(r => (
                      <TableRow key={r.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/solicitacoes/${r.id}`)}>
                        <TableCell className="font-mono text-xs">{r.numero}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{r.item_descricao}</TableCell>
                        <TableCell>{r.quantidade}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={PRIORITY_BADGE[r.prioridade]}>{PRIORITY_LABEL[r.prioridade]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={slaBadge(r.days_since)}>{r.days_since}d</Badge>
                        </TableCell>
                        <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Open quotes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" /> Cotações em aberto</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {openQuotes.isLoading ? (
                <div className="p-4"><TableSkeleton rows={4} columns={4} /></div>
              ) : (openQuotes.data ?? []).length === 0 ? (
                <EmptyState icon={Search} title="Sem RFQs em aberto" description="Nenhuma requisição com cotações aguardando escolha." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requisição</TableHead>
                      <TableHead>Propostas</TableHead>
                      <TableHead>Melhor preço</TableHead>
                      <TableHead>Melhor prazo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(openQuotes.data ?? []).slice(0, 10).map(q => (
                      <TableRow key={q.request_id} className="hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/solicitacoes/${q.request_id}`)}>
                        <TableCell>
                          <div className="font-mono text-xs">{q.request_numero}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{q.item_descricao}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{q.count}</Badge></TableCell>
                        <TableCell>{q.best_price !== null ? formatBRL(q.best_price) : '—'}</TableCell>
                        <TableCell>{q.best_lead !== null ? `${q.best_lead}d` : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pending receipts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Pedidos pendentes de recebimento</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pendingReceipts.isLoading ? (
                <div className="p-4"><TableSkeleton rows={4} columns={5} /></div>
              ) : (pendingReceipts.data ?? []).length === 0 ? (
                <EmptyState icon={Truck} title="Nada pendente" description="Não há pedidos em aberto." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(pendingReceipts.data ?? []).slice(0, 10).map(o => (
                      <TableRow key={o.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/pedidos/${o.id}`)}>
                        <TableCell className="font-mono text-xs">{o.numero}</TableCell>
                        <TableCell className="max-w-[140px] truncate">{o.supplier_name}</TableCell>
                        <TableCell>{formatBRL(o.valor_total)}</TableCell>
                        <TableCell>
                          {o.due_date ? (
                            <div className="flex flex-col">
                              <span className="text-xs">{format(new Date(o.due_date), 'dd/MM/yy', { locale: ptBR })}</span>
                              {o.late_days > 0 && (
                                <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-500/30 text-[10px] py-0 px-1.5 w-fit mt-0.5">
                                  {o.late_days}d atraso
                                </Badge>
                              )}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ORDER_STATUS_BADGE[o.status as keyof typeof ORDER_STATUS_BADGE]}>
                            {ORDER_STATUS_LABEL[o.status as keyof typeof ORDER_STATUS_LABEL]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Late suppliers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Atrasos por fornecedor (90 dias)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {lateSuppliers.isLoading ? (
                <div className="p-4"><TableSkeleton rows={4} columns={3} /></div>
              ) : (lateSuppliers.data ?? []).length === 0 ? (
                <EmptyState icon={Building2} title="Nenhum atraso" description="Fornecedores em dia nos últimos 90 dias." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Atrasados</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">% no prazo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(lateSuppliers.data ?? []).map(s => (
                      <TableRow key={s.supplier_id} className="hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/fornecedores`)}>
                        <TableCell className="font-medium">{s.supplier_name}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-500/30">{s.late_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{s.total_in_period}</TableCell>
                        <TableCell className="text-right">{s.pct_no_prazo.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

function KpiCard({ icon, label, value, loading }: { icon: React.ReactNode; label: string; value: React.ReactNode; loading?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="text-xl font-bold mt-1">{loading ? '...' : value}</div>
      </CardContent>
    </Card>
  );
}
