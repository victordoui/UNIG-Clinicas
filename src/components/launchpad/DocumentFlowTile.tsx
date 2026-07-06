import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GitBranch, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DocumentFlow } from './DocumentFlow';
import { cn } from '@/lib/utils';

export function DocumentFlowTile() {
  const [open, setOpen] = useState(false);
  const [numero, setNumero] = useState('');
  const [rootId, setRootId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const resolve = async () => {
    const n = numero.trim();
    if (!n) return;
    setLoading(true);
    setRootId(null);
    try {
      // Try purchase_requests by numero
      let { data: req } = await (supabase as any)
        .from('purchase_requests').select('id').ilike('numero', n).maybeSingle();
      if (req?.id) { setRootId(req.id); return; }
      // Then purchase_orders -> request_id
      const { data: ord } = await (supabase as any)
        .from('purchase_orders').select('request_id').ilike('numero', n).maybeSingle();
      if (ord?.request_id) { setRootId(ord.request_id); return; }
      toast({ title: 'Documento não encontrado', description: `Nada encontrado para "${n}"`, variant: 'destructive' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block group text-left w-full"
      >
        <Card className={cn(
          'relative h-[148px] p-4 flex flex-col justify-between overflow-hidden',
          'border-l-4 border-primary/40 transition-all duration-200',
          'hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/60',
        )}>
          <GitBranch className="h-6 w-6 text-primary" />
          <div>
            <div className="text-base font-semibold">Fluxo do documento</div>
            <div className="text-xs text-muted-foreground mt-1">SC, Cotação, Pedido</div>
          </div>
          <div className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Buscar →</div>
        </Card>
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setRootId(null); setNumero(''); } }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5" />Fluxo do documento</DialogTitle>
            <DialogDescription>Informe o número da Solicitação (SC) ou do Pedido (PO) para visualizar a cadeia completa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label>Número do documento</Label>
                <Input
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && resolve()}
                  placeholder="Ex: SC-2025-0001 ou PO-2025-0123"
                  autoFocus
                />
              </div>
              <Button onClick={resolve} disabled={loading || !numero.trim()}>
                <Search className="h-4 w-4 mr-1" />Buscar
              </Button>
            </div>
            {loading && <Skeleton className="h-32 w-full" />}
            {rootId && <DocumentFlow rootRequestId={rootId} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
