import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, X, XCircle, Loader2 } from 'lucide-react';
import type { InboxItem } from '@/hooks/useInbox';
import { useBulkInboxActions, type BulkDecision } from '@/hooks/useBulkInboxActions';

interface Props {
  items: InboxItem[];
  onDone: () => void;
  onClear: () => void;
}

export function BulkActionBar({ items, onDone, onClear }: Props) {
  const { bulkApprove, bulkReject, isRunning, progress } = useBulkInboxActions();
  const [open, setOpen] = useState<BulkDecision | null>(null);
  const [comentario, setComentario] = useState('');

  async function confirm() {
    if (!open) return;
    const fn = open === 'aprovado' ? bulkApprove : bulkReject;
    await fn(items, comentario.trim() || undefined);
    setOpen(null);
    setComentario('');
    onDone();
  }

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
        <div className="flex items-center gap-3 rounded-full border bg-card shadow-lg px-4 py-2">
          <span className="text-sm font-medium">{items.length} selecionado(s)</span>
          <div className="h-5 w-px bg-border" />
          <Button
            size="sm"
            variant="default"
            disabled={isRunning}
            onClick={() => setOpen('aprovado')}
          >
            {isRunning && progress ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            Aprovar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isRunning}
            onClick={() => setOpen('rejeitado')}
          >
            <X className="h-4 w-4 mr-1" /> Rejeitar
          </Button>
          <Button size="sm" variant="ghost" disabled={isRunning} onClick={onClear}>
            <XCircle className="h-4 w-4 mr-1" /> Limpar
          </Button>
          {isRunning && progress && (
            <span className="text-xs text-muted-foreground">
              {progress.done}/{progress.total}
            </span>
          )}
        </div>
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {open === 'aprovado' ? 'Aprovar' : 'Rejeitar'} {items.length} item(ns)?
            </DialogTitle>
            <DialogDescription>
              A decisão será aplicada a cada item selecionado. Comentário opcional aplicado a todos.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Comentário (opcional)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(null)} disabled={isRunning}>
              Cancelar
            </Button>
            <Button
              variant={open === 'rejeitado' ? 'destructive' : 'default'}
              onClick={confirm}
              disabled={isRunning}
            >
              {isRunning && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
