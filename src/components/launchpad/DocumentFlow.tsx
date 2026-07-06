import { useNavigate } from 'react-router-dom';
import { useDocumentFlow, type FlowNode } from '@/hooks/useDocumentFlow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Quote, FileSignature, PackageCheck, GitBranch, ChevronRight } from 'lucide-react';
import { STATUS_LABEL, STATUS_BADGE, formatBRL } from '@/lib/purchaseLabels';
import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE } from '@/hooks/usePurchaseOrders';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DocumentFlowProps {
  rootRequestId: string;
  currentType?: 'request' | 'order' | 'quotes' | 'receipts';
  currentId?: string;
}

const NODE_ICON = {
  request: FileText,
  quotes: Quote,
  order: FileSignature,
  receipts: PackageCheck,
} as const;

const NODE_TITLE = {
  request: 'Solicitação',
  quotes: 'Cotações',
  order: 'Pedido',
  receipts: 'Recebimento',
} as const;

function statusLabel(node: FlowNode): string {
  if (node.tipo === 'request') return STATUS_LABEL[node.status as keyof typeof STATUS_LABEL] ?? node.status ?? '—';
  if (node.tipo === 'order') return ORDER_STATUS_LABEL[node.status as keyof typeof ORDER_STATUS_LABEL] ?? node.status ?? '—';
  if (node.tipo === 'quotes') return node.status === 'escolhida' ? 'Cotação escolhida' : `${node.count ?? 0} recebida(s)`;
  if (node.tipo === 'receipts') {
    if (node.status === 'completo') return 'Recebido total';
    if (node.status === 'parcial') return 'Parcial';
    return 'Pendente';
  }
  return '—';
}

function statusClass(node: FlowNode): string {
  if (node.tipo === 'request') return STATUS_BADGE[node.status as keyof typeof STATUS_BADGE] ?? '';
  if (node.tipo === 'order') return ORDER_STATUS_BADGE[node.status as keyof typeof ORDER_STATUS_BADGE] ?? '';
  if (node.tipo === 'quotes') return node.status === 'escolhida'
    ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
    : 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30';
  if (node.tipo === 'receipts') {
    if (node.status === 'completo') return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
    if (node.status === 'parcial') return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
    return 'bg-muted text-muted-foreground border-border';
  }
  return '';
}

export function DocumentFlow({ rootRequestId, currentType, currentId }: DocumentFlowProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useDocumentFlow(rootRequestId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><GitBranch className="h-4 w-4" />Fluxo do documento</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  const nodes = data?.nodes ?? [];
  if (!nodes.length) return null;

  const handleClick = (n: FlowNode) => {
    if (n.tipo === 'request') navigate(`/solicitacoes/${n.id}`);
    else if (n.tipo === 'order') navigate(`/pedidos/${n.id}`);
    else if (n.tipo === 'quotes') navigate(`/solicitacoes/${rootRequestId}`);
    else if (n.tipo === 'receipts' && n.order_id) navigate(`/pedidos/${n.order_id}`);
  };

  const isCurrent = (n: FlowNode) => {
    if (!currentType) return false;
    if (currentType !== n.tipo) return false;
    if (currentId) return n.id === currentId || n.order_id === currentId;
    return true;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4" />Fluxo do documento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2">
          <div className="flex items-stretch gap-2 min-w-max">
            {nodes.map((n, i) => {
              const Icon = NODE_ICON[n.tipo];
              const current = isCurrent(n);
              return (
                <div key={`${n.tipo}-${n.id}-${i}`} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className={cn(
                      'group text-left rounded-lg border bg-card p-3 min-w-[180px] transition-all hover:shadow-md hover:border-primary/50',
                      current && 'ring-2 ring-primary border-primary/50 shadow-sm'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={cn(
                        'h-7 w-7 rounded-md flex items-center justify-center',
                        current ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{NODE_TITLE[n.tipo]}</div>
                        <div className="font-mono text-xs truncate">{n.numero ?? (n.tipo === 'quotes' ? `${n.count ?? 0} resposta(s)` : '—')}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] font-medium', statusClass(n))}>
                      {statusLabel(n)}
                    </Badge>
                    <div className="mt-1.5 text-[10px] text-muted-foreground space-y-0.5">
                      {n.data && <div>{format(new Date(n.data), 'dd/MM/yyyy HH:mm')}</div>}
                      {n.tipo === 'order' && n.meta?.supplier && <div className="truncate">{n.meta.supplier}</div>}
                      {n.tipo === 'order' && n.valor != null && <div className="font-medium text-foreground">{formatBRL(Number(n.valor))}</div>}
                      {n.tipo === 'receipts' && (
                        <div>{Number(n.meta?.qtd_recebida ?? 0)} / {Number(n.meta?.qtd_pedido ?? 0)}</div>
                      )}
                    </div>
                  </button>
                  {i < nodes.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
