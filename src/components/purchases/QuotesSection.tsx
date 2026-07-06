import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Award, FileSignature, ExternalLink, Trophy, Zap } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useQuotes, useChooseQuote, useDeleteQuote, useCreatePurchaseOrder } from '@/hooks/useQuotes';
import { useSuppliers } from '@/hooks/useSuppliers';
import { usePurchaseOrderByRequest, ORDER_STATUS_LABEL, ORDER_STATUS_BADGE } from '@/hooks/usePurchaseOrders';
import { QuoteFormModal } from './QuoteFormModal';
import { formatBRL } from '@/lib/purchaseLabels';
import type { PurchaseRequest } from '@/hooks/usePurchaseRequests';
import { useSupplierRanking, TIER_LABEL, TIER_CLASS } from '@/hooks/useSupplierScorecard';

interface Props {
  request: PurchaseRequest;
  canManage: boolean;
}

const STATUS_AFTER_APPROVED: any[] = ['aprovada', 'em_cotacao', 'compra_realizada', 'aguardando_entrega', 'recebida', 'finalizada'];

type QuoteRow = {
  id: string;
  supplier_id: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  prazo_entrega_dias: number | null;
  condicao_pagamento: string | null;
  observacoes: string | null;
  status: string;
};

function computeQuoteHighlights(quotes: QuoteRow[]) {
  const active = quotes.filter(q => q.status !== 'descartada');
  const totals = active.map(q => Number(q.valor_total));
  const minTotal = totals.length ? Math.min(...totals) : 0;
  const maxTotal = totals.length ? Math.max(...totals) : 0;

  const prazos = active
    .map(q => (q.prazo_entrega_dias != null ? Number(q.prazo_entrega_dias) : null))
    .filter((v): v is number => v != null && v > 0);
  const minPrazo = prazos.length ? Math.min(...prazos) : null;

  const minTotalIds = new Set(active.filter(q => Number(q.valor_total) === minTotal).map(q => q.id));
  const minPrazoIds = new Set(
    minPrazo != null
      ? active.filter(q => q.prazo_entrega_dias != null && Number(q.prazo_entrega_dias) === minPrazo).map(q => q.id)
      : [],
  );

  const scores = new Map<string, number>();
  for (const q of quotes) {
    const total = Number(q.valor_total) || 0;
    const prazo = q.prazo_entrega_dias != null ? Number(q.prazo_entrega_dias) : null;
    const priceScore = total > 0 ? (minTotal / total) * 100 : 0;
    if (minPrazo != null && prazo != null && prazo > 0) {
      scores.set(q.id, Math.round(priceScore * 0.7 + (minPrazo / prazo) * 100 * 0.3));
    } else {
      scores.set(q.id, Math.round(priceScore));
    }
  }

  return { minTotal, maxTotal, minPrazo, minTotalIds, minPrazoIds, scores };
}

export function QuotesSection({ request, canManage }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const showQuotes = STATUS_AFTER_APPROVED.includes(request.status);
  const { data: quotes = [], isLoading } = useQuotes(showQuotes ? request.id : undefined);
  const { data: suppliers = [] } = useSuppliers();
  const { data: order } = usePurchaseOrderByRequest(showQuotes ? request.id : undefined);
  const choose = useChooseQuote(request.id);
  const remove = useDeleteQuote(request.id);
  const createOrder = useCreatePurchaseOrder();

  const highlights = useMemo(() => computeQuoteHighlights(quotes as QuoteRow[]), [quotes]);
  const { data: ranking = [] } = useSupplierRanking(90);
  const scoreOf = (id: string) => ranking.find((r) => r.supplier_id === id);

  if (!showQuotes) return null;

  const supplierName = (id: string) => suppliers.find(s => s.id === id)?.nome_fantasia ?? '—';
  const chosen = (quotes as QuoteRow[]).find(q => q.status === 'escolhida');
  const canChoose = canManage && !chosen && !order;

  const cheapest = (quotes as QuoteRow[]).find(q => highlights.minTotalIds.has(q.id));
  const fastest = (quotes as QuoteRow[]).find(q => highlights.minPrazoIds.has(q.id));
  const economy = highlights.maxTotal - highlights.minTotal;

  const handleGenerateOrder = async () => {
    if (!chosen) return;
    const id = await createOrder.mutateAsync(chosen.id);
    if (id) navigate(`/pedidos/${id}`);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" />Cotações</CardTitle>
          {canManage && !order && (
            <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Nova cotação</Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma cotação registrada ainda.</p>
          ) : (
            <div className="space-y-3 animate-fade-in">
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Unitário</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Prazo</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(quotes as QuoteRow[]).map(q => {
                      const isChosen = q.status === 'escolhida';
                      const isDiscarded = q.status === 'descartada';
                      const isCheap = highlights.minTotalIds.has(q.id) && !isDiscarded;
                      const isFast = highlights.minPrazoIds.has(q.id) && !isDiscarded;
                      const score = highlights.scores.get(q.id) ?? 0;

                      return (
                        <TableRow
                          key={q.id}
                          className={
                            isChosen ? 'bg-emerald-500/5' :
                            isDiscarded ? 'opacity-60' :
                            isCheap ? 'bg-emerald-500/[0.03]' : ''
                          }
                        >
                          <TableCell>
                            <div className="font-medium text-sm flex items-center gap-1.5">
                              {supplierName(q.supplier_id)}
                              {(() => {
                                const sc = scoreOf(q.supplier_id);
                                if (!sc || sc.tier === 'sem_dados') return null;
                                return (
                                  <Badge
                                    variant="outline"
                                    className={TIER_CLASS[sc.tier] + ' text-[10px] px-1.5'}
                                    title={`Score ${Number(sc.score_final).toFixed(1)} — ${TIER_LABEL[sc.tier]}`}
                                  >
                                    {TIER_LABEL[sc.tier]} · {Number(sc.score_final).toFixed(0)}
                                  </Badge>
                                );
                              })()}
                            </div>
                            {q.observacoes && <div className="text-xs italic text-muted-foreground mt-0.5 max-w-[20ch] truncate" title={q.observacoes}>"{q.observacoes}"</div>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{Number(q.quantidade)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatBRL(q.valor_unitario)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="font-medium">{formatBRL(q.valor_total)}</span>
                              {isCheap && (
                                <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 px-1.5">
                                  <Trophy className="h-3 w-3" />Melhor
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {q.prazo_entrega_dias != null ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <span>{q.prazo_entrega_dias}d</span>
                                {isFast && (
                                  <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1 px-1.5">
                                    <Zap className="h-3 w-3" />Rápido
                                  </Badge>
                                )}
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-sm">{q.condicao_pagamento || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            <span className={
                              score >= 90 ? 'text-emerald-600 font-medium' :
                              score >= 75 ? 'text-foreground' :
                              'text-muted-foreground'
                            }>{score}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              isChosen ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' :
                              isDiscarded ? 'bg-muted text-muted-foreground' :
                              'bg-sky-500/15 text-sky-700 border-sky-500/30'
                            }>{q.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canChoose && q.status === 'recebida' && (
                                <LoadingButton size="sm" loading={choose.isPending} onClick={() => choose.mutate(q.id)}>
                                  Escolher
                                </LoadingButton>
                              )}
                              {canManage && !order && !isChosen && (
                                <Button size="icon" variant="ghost" onClick={() => remove.mutate(q.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground px-1">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>{quotes.length} cotação{quotes.length === 1 ? '' : 'ões'}</span>
                  {cheapest && <span>· Melhor preço: <strong className="text-foreground">{formatBRL(highlights.minTotal)}</strong> ({supplierName(cheapest.supplier_id)})</span>}
                  {fastest && highlights.minPrazo != null && <span>· Mais rápido: <strong className="text-foreground">{highlights.minPrazo}d</strong> ({supplierName(fastest.supplier_id)})</span>}
                  {economy > 0 && <span>· Economia: <strong className="text-emerald-600">{formatBRL(economy)}</strong></span>}
                </div>
              </div>

              {chosen && !order && canManage && (
                <div className="pt-1">
                  <LoadingButton loading={createOrder.isPending} onClick={handleGenerateOrder}>
                    <FileSignature className="h-4 w-4 mr-1" /> Gerar Pedido de Compra
                  </LoadingButton>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {order && (
        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><FileSignature className="h-4 w-4" />Pedido vinculado</CardTitle>
              <div className="text-xs text-muted-foreground font-mono mt-1">{order.numero}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate(`/pedidos/${order.id}`)}>
              Abrir <ExternalLink className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Fornecedor</div><div className="font-medium">{supplierName(order.supplier_id)}</div></div>
            <div><div className="text-xs text-muted-foreground">Valor total</div><div className="font-medium">{formatBRL(order.valor_total)}</div></div>
            <div><div className="text-xs text-muted-foreground">Quantidade</div><div className="font-medium">{Number(order.quantidade)}</div></div>
            <div><div className="text-xs text-muted-foreground">Status</div>
              <Badge variant="outline" className={ORDER_STATUS_BADGE[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <QuoteFormModal open={open} onOpenChange={setOpen} requestId={request.id} defaultQuantidade={request.quantidade} />
    </>
  );
}
