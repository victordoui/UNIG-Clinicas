import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useMarkChargePaid } from '@/hooks/useFinance';
import { PAYMENT_METHOD_LABEL, formatBRL } from '@/lib/finance';

export function MarkAsPaidDialog({ charge, trigger }: { charge: any; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<string>('pix');
  const [paidAt, setPaidAt] = useState<string>('');
  const pay = useMarkChargePaid();

  useEffect(() => {
    if (open) {
      setAmount(Number(charge?.net_amount ?? 0));
      setMethod('pix');
      setPaidAt(new Date().toISOString().slice(0, 10));
    }
  }, [open, charge]);

  const submit = async () => {
    try {
      await pay.mutateAsync({ chargeId: charge.id, paidAmount: Number(amount) || 0, method, paidAt: paidAt ? new Date(paidAt).toISOString() : undefined });
      toast({ title: 'Pagamento registrado' });
      setOpen(false);
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Registrar pagamento</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Valor da cobrança: <span className="font-medium text-foreground">{formatBRL(charge?.net_amount)}</span></p>
        <div className="space-y-3">
          <div><Label>Valor pago (R$)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
          <div><Label>Método</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PAYMENT_METHOD_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Data</Label><Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={pay.isPending}>{pay.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
