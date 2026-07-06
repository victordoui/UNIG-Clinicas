import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table';
import { FileSignature, Paperclip } from 'lucide-react';
import { usePurchaseOrders, ORDER_STATUS_LABEL, ORDER_STATUS_BADGE } from '@/hooks/usePurchaseOrders';
import { useSuppliers } from '@/hooks/useSuppliers';
import { formatBRL } from '@/lib/purchaseLabels';
import { format } from 'date-fns';

export default function Pedidos() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = usePurchaseOrders();
  const { data: suppliers = [] } = useSuppliers();
  const supplierName = (id: string) => suppliers.find(s => s.id === id)?.nome_fantasia ?? '—';

  const columns: ResponsiveColumn<typeof orders[number]>[] = [
    {
      key: 'numero',
      header: 'Número',
      mobilePrimary: true,
      cell: (o) => <span className="font-mono text-xs">{o.numero}</span>,
    },
    { key: 'fornecedor', header: 'Fornecedor', cell: (o) => supplierName(o.supplier_id) },
    { key: 'valor', header: 'Valor', cell: (o) => formatBRL(o.valor_total) },
    {
      key: 'status',
      header: 'Status',
      cell: (o) => (
        <Badge variant="outline" className={ORDER_STATUS_BADGE[o.status]}>
          {ORDER_STATUS_LABEL[o.status]}
        </Badge>
      ),
    },
    {
      key: 'nf',
      header: 'NF',
      hideOnMobile: true,
      cell: (o) =>
        o.nota_fiscal_path ? (
          <Paperclip className="h-4 w-4 text-emerald-600" aria-label="Tem nota fiscal" />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: 'emitido',
      header: 'Emitido em',
      cell: (o) => (
        <span className="text-xs">{format(new Date(o.created_at), 'dd/MM/yyyy HH:mm')}</span>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSignature className="h-6 w-6 text-primary" />
            Pedidos de Compra
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe os pedidos emitidos e seu status de recebimento.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lista de pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : (
              <ResponsiveTable
                data={orders}
                columns={columns}
                rowKey={(o) => o.id}
                onRowClick={(o) => navigate(`/pedidos/${o.id}`)}
                emptyState={
                  <EmptyState
                    icon={FileSignature}
                    title="Nenhum pedido emitido"
                    description="Pedidos aparecem aqui após escolher uma cotação vencedora em uma solicitação aprovada."
                  />
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
