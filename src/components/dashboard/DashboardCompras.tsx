import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileSignature, ShoppingCart, KanbanSquare, Briefcase,
  Receipt, Users, Package, Search, AlertTriangle, Banknote, ClipboardList,
  Truck, Building2, ChevronRight, PackageCheck,
  type LucideIcon,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RoleHomeCover } from "@/components/dashboard/RoleHomeCover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CIStatusBadge } from "@/components/ci/CIStatusBadge";
import { useCIList, type CIRequest } from "@/hooks/useCI";
import { useAuth } from "@/hooks/useAuth";
import { useBuyerPanel } from "@/hooks/useBuyerPanel";
import { useMyCostCenters } from "@/hooks/useUserCostCenters";
import { formatBRL, PRIORITY_LABEL, PRIORITY_BADGE } from "@/lib/purchaseLabels";
import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE } from "@/hooks/usePurchaseOrders";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function DashboardCompras() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ccFilter, setCcFilter] = useState<string>("all");
  const { data: myCCs = [] } = useMyCostCenters();

  const { data: all, isLoading } = useCIList();
  const list = all ?? [];

  const minhas = list.filter((c) => c.assigned_to === user?.id || c.assigned_to_secondary === user?.id);
  const minhasAtivas = minhas.filter(c => !["finalizada", "cancelada", "reprovada"].includes(c.status));
  const emCotacao = minhasAtivas.filter(c => c.status === "em_cotacao").length;
  const pedidosEmitidos = minhasAtivas.filter(c => c.status === "pedido_emitido").length;
  const emEntrega = minhasAtivas.filter(c => c.status === "aguardando_entrega").length;

  const minhasRecentes = minhasAtivas.slice(0, 5);

  const { kpis, approvedQueue, openQuotes, pendingReceipts, lateSuppliers } = useBuyerPanel(ccFilter);

  const slaBadge = (d: number) => {
    if (d <= 2) return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
    if (d <= 5) return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    return "bg-red-500/15 text-red-700 border-red-500/30";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <RoleHomeCover
        chipLabel="Painel de Compras"
        chipIcon={Briefcase}
        description="Centro de operações do setor — fila de aprovadas, cotações, pedidos e fornecedores."
        ctas={[
          { label: "Minhas CIs", icon: KanbanSquare, to: "/compras/kanban?view=mine", primary: true },
          { label: "Cotações", icon: Search, to: "/dashboard/cotacoes" },
        ]}
        kpis={[
          { label: "Minhas CIs", subtitle: "ativas", value: isLoading ? "…" : minhasAtivas.length, icon: FileSignature, tone: "violet" },
          { label: "Em cotação", subtitle: "sob minha responsabilidade", value: isLoading ? "…" : emCotacao, icon: Search, tone: "blue" },
          { label: "Pedidos", subtitle: "emitidos", value: isLoading ? "…" : pedidosEmitidos, icon: ShoppingCart, tone: "emerald" },
          { label: "Em entrega", subtitle: "aguardando recebimento", value: isLoading ? "…" : emEntrega, icon: Truck, tone: "orange" },
        ]}
      />

      {myCCs.length > 0 && (
        <div className="flex items-center gap-2 justify-end">
          <Label className="text-xs text-muted-foreground">Centro de Custo</Label>
          <Select value={ccFilter} onValueChange={setCcFilter}>
            <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {myCCs.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* KPIs operacionais (Painel do Comprador) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={<Package className="h-4 w-4" />} label="Aprovadas s/ pedido" value={kpis.approvedNoOrder} loading={approvedQueue.isLoading} />
        <KpiCard icon={<Search className="h-4 w-4" />} label="Cotações em aberto" value={kpis.openQuotes} loading={openQuotes.isLoading} />
        <KpiCard icon={<FileSignature className="h-4 w-4" />} label="Pedidos em aberto" value={kpis.openOrders} loading={pendingReceipts.isLoading} />
        <KpiCard icon={<AlertTriangle className="h-4 w-4 text-red-500" />} label="Atrasados" value={kpis.lateOrders} loading={pendingReceipts.isLoading} />
        <KpiCard icon={<Banknote className="h-4 w-4" />} label="Valor em aberto" value={formatBRL(kpis.openValue)} loading={pendingReceipts.isLoading} />
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <QuickAction to="/compras/kanban?view=mine" icon={KanbanSquare} title="Minhas CIs" />
        <QuickAction to="/dashboard/cotacoes" icon={Receipt} title="Cotações" />
        <QuickAction to="/dashboard/pedidos" icon={Briefcase} title="Pedidos" />
        <QuickAction to="/recebimentos/conferencia" icon={PackageCheck} title="Recebimentos" />
        <QuickAction to="/dashboard/fornecedores" icon={Users} title="Fornecedores" />
      </div>

      {/* Painel do Comprador - tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Fila de Requisições Aprovadas
            </CardTitle>
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
                  {(approvedQueue.data ?? []).slice(0, 5).map(r => (
                    <TableRow key={r.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/dashboard/ci/${r.id}`)}>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" /> Cotações em aberto
            </CardTitle>
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
                  {(openQuotes.data ?? []).slice(0, 5).map(q => (
                    <TableRow key={q.request_id} className="hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/compras/cotacoes`)}>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" /> Pedidos pendentes de recebimento
            </CardTitle>
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
                  {(pendingReceipts.data ?? []).slice(0, 5).map(o => (
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Atrasos por fornecedor (90 dias)
            </CardTitle>
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

      <div>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><FileSignature className="h-4 w-4 text-primary" /> Minhas CIs</h2>
            <Link to="/compras/kanban?view=mine" className="text-xs text-primary hover:underline">Ver todas</Link>
          </div>
          <CIList rows={minhasRecentes} emptyText="Nenhuma CI atribuída a você." />
        </Card>
      </div>
    </div>
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

function QuickAction({ to, icon: Icon, title }: { to: string; icon: LucideIcon; title: string }) {
  return (
    <Link to={to}>
      <Card className="p-4 h-full hover:shadow-md hover:border-primary/30 transition-all">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="font-semibold text-sm">{title}</div>
        </div>
      </Card>
    </Link>
  );
}

function CIList({ rows, emptyText }: { rows: CIRequest[]; emptyText: string }) {
  if (!rows || rows.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="divide-y">
      {rows.map((c) => (
        <li key={c.id} className="py-2 flex items-center justify-between gap-3">
          <Link to={`/dashboard/ci/${c.id}`} className="flex-1 min-w-0">
            <div className="font-mono text-xs text-primary">{c.protocol}</div>
            <div className="text-sm truncate">{c.subject}</div>
          </Link>
          <CIStatusBadge status={c.status} />
        </li>
      ))}
    </ul>
  );
}
