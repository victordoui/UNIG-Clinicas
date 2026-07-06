import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUpdatePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { BulkInvoiceUploadModal } from './BulkInvoiceUploadModal';
import { Loader2, CheckCircle2, FileUp, X } from 'lucide-react';
import type { SupplierInboxItem } from '@/hooks/useSupplierInbox';

interface Props {
  selected: SupplierInboxItem[];
  onClear: () => void;
  onDone: () => void;
}

const extractOrderId = (id: string) => id.replace(/^(order|nf)-/, '');

export function BulkSupplierActionBar({ selected, onClear, onDone }: Props) {
  const { toast } = useToast();
  const updateOrder = useUpdatePurchaseOrder();
  const [confirming, setConfirming] = useState(false);
  const [nfOpen, setNfOpen] = useState(false);

  if (selected.length === 0) return null;

  const orderItems = selected.filter((i) => i.kind === 'order');
  const nfItems = selected.filter((i) => i.kind === 'nf');

  const handleConfirmOrders = async () => {
    setConfirming(true);
    let done = 0;
    let failed = 0;
    for (const item of orderItems) {
      try {
        await updateOrder.mutateAsync({ id: extractOrderId(item.id), status: 'confirmado' as any });
        done++;
      } catch {
        failed++;
      }
    }
    setConfirming(false);
    toast({
      title: 'Confirmação em lote',
      description: `${done} de ${orderItems.length} pedidos confirmados${failed ? ` (${failed} falhas)` : ''}`,
    });
    onDone();
  };

  return (
    <>
      <div className="sticky bottom-4 z-30 flex justify-center animate-fade-in">
        <div className="bg-card border shadow-lg rounded-full px-4 py-2 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{selected.length} selecionado(s)</span>
          {orderItems.length > 0 && (
            <Button size="sm" onClick={handleConfirmOrders} disabled={confirming}>
              {confirming ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Confirmar {orderItems.length} pedido(s)
            </Button>
          )}
          {nfItems.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => setNfOpen(true)}>
              <FileUp className="h-4 w-4 mr-1" /> Enviar {nfItems.length} NF(s)
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onClear}>
            <X className="h-4 w-4 mr-1" /> Limpar
          </Button>
        </div>
      </div>

      <BulkInvoiceUploadModal
        open={nfOpen}
        onOpenChange={setNfOpen}
        orders={nfItems.map((i) => ({ orderId: extractOrderId(i.id), numero: i.reference ?? '' })).filter((o) => o.numero)}
        onDone={onDone}
      />
    </>
  );
}
