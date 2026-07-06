import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRegisterPayment, type AccountPayable } from '@/hooks/useAccountsPayable';
import { useBankAccounts } from '@/hooks/useBankAccounts';

interface Props {
  payable: AccountPayable | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function RegisterPaymentModal({ payable, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: bankAccounts = [] } = useBankAccounts();
  const register = useRegisterPayment();

  const saldo = payable ? Number(payable.valor_total) - Number(payable.valor_pago) : 0;
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [forma, setForma] = useState('pix');
  const [bankId, setBankId] = useState<string>('');
  const [obs, setObs] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const reset = () => {
    setValor(''); setData(new Date().toISOString().slice(0, 10)); setForma('pix');
    setBankId(''); setObs(''); setFile(null);
  };

  const submit = async () => {
    if (!payable) return;
    const v = parseFloat(valor);
    if (!v || v <= 0) return toast({ title: 'Informe um valor válido', variant: 'destructive' });
    if (v > saldo + 0.01) return toast({ title: 'Valor maior que o saldo devedor', variant: 'destructive' });
    await register.mutateAsync({
      account_payable_id: payable.id,
      valor: v,
      data_pagamento: data,
      forma_pagamento: forma,
      bank_account_id: bankId || null,
      observacoes: obs || null,
      comprovante_file: file,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>
        {payable && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 bg-muted/30 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Valor total</span><span>R$ {Number(payable.valor_total).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Já pago</span><span>R$ {Number(payable.valor_pago).toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold"><span>Saldo devedor</span><span>R$ {saldo.toFixed(2)}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor *</Label>
                <Input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder={saldo.toFixed(2)} />
              </div>
              <div>
                <Label>Data *</Label>
                <Input type="date" value={data} onChange={e => setData(e.target.value)} />
              </div>
              <div>
                <Label>Forma</Label>
                <Select value={forma} onValueChange={setForma}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conta bancária</Label>
                <Select value={bankId} onValueChange={setBankId}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {bankAccounts.filter(b => b.ativo).map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Comprovante (opcional)</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={register.isPending}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
