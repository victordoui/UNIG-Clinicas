import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { useRegisterReceipt } from '@/hooks/useReceipts';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  quantidadeRestante: number;
}

export function ReceiptModal({ open, onOpenChange, orderId, quantidadeRestante }: Props) {
  const register = useRegisterReceipt(orderId);
  const { toast } = useToast();
  const [qt, setQt] = useState(String(quantidadeRestante));
  const [obs, setObs] = useState('');
  const [div, setDiv] = useState(false);
  const [divDesc, setDivDesc] = useState('');

  const submit = async () => {
    const n = Number(qt.replace(',', '.'));
    if (!(n > 0)) return toast({ title: 'Quantidade inválida', variant: 'destructive' });
    await register.mutateAsync({
      quantidade: n,
      observacoes: obs || undefined,
      divergencia: div,
      divergencia_desc: div ? divDesc || undefined : undefined,
    });
    onOpenChange(false);
    setObs(''); setDiv(false); setDivDesc('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Registrar recebimento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Quantidade recebida</Label>
            <Input value={qt} onChange={e => setQt(e.target.value)} inputMode="decimal" />
            <p className="text-xs text-muted-foreground mt-1">Restante a receber: {quantidadeRestante}</p>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="div" checked={div} onCheckedChange={v => setDiv(!!v)} />
            <Label htmlFor="div" className="cursor-pointer">Houve divergência</Label>
          </div>
          {div && (
            <div>
              <Label>Descrição da divergência</Label>
              <Textarea value={divDesc} onChange={e => setDivDesc(e.target.value)} rows={2} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <LoadingButton loading={register.isPending} onClick={submit}>Registrar</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
