import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUploadInvoice } from '@/hooks/usePurchaseOrders';
import { Loader2, FileUp } from 'lucide-react';

interface OrderRef {
  orderId: string;
  numero: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orders: OrderRef[];
  onDone?: () => void;
}

export function BulkInvoiceUploadModal({ open, onOpenChange, orders, onDone }: Props) {
  const { toast } = useToast();
  const upload = useUploadInvoice();
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [running, setRunning] = useState(false);

  const matchOrder = (file: File): OrderRef | undefined => {
    const name = file.name.toLowerCase();
    return orders.find((o) => name.includes(o.numero.toLowerCase()));
  };

  const handleRun = async () => {
    if (files.length === 0) return;
    setRunning(true);
    let done = 0;
    let failed = 0;
    setProgress({ done: 0, total: files.length, failed: 0 });
    for (const file of files) {
      const match = matchOrder(file);
      if (!match) {
        failed++;
        setProgress({ done, total: files.length, failed });
        continue;
      }
      try {
        await upload.mutateAsync({
          orderId: match.orderId,
          file,
          numero: file.name.replace(/\.[^.]+$/, ''),
        });
        done++;
      } catch {
        failed++;
      }
      setProgress({ done, total: files.length, failed });
    }
    setRunning(false);
    toast({
      title: 'Upload concluído',
      description: `${done} de ${files.length} processados${failed ? ` (${failed} falhas)` : ''}`,
    });
    onDone?.();
    if (failed === 0) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Envio em lote de notas fiscais</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Selecione os arquivos. O nome de cada arquivo deve conter o número do pedido (ex: <span className="font-mono">PED-0042.pdf</span>).
          </p>
          <div>
            <Label className="text-xs">Pedidos selecionados ({orders.length})</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {orders.map((o) => (
                <span key={o.orderId} className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{o.numero}</span>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="bulk-nf-files">Arquivos</Label>
            <Input
              id="bulk-nf-files"
              type="file"
              multiple
              accept=".pdf,.xml"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              disabled={running}
            />
          </div>
          {progress && (
            <div className="text-xs text-muted-foreground">
              {progress.done} de {progress.total} processados{progress.failed ? ` — ${progress.failed} falhas` : ''}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>Cancelar</Button>
          <Button onClick={handleRun} disabled={running || files.length === 0}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileUp className="h-4 w-4 mr-2" />}
            Enviar {files.length > 0 ? `${files.length} arquivo(s)` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
