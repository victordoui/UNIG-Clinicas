import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingButton } from '@/components/ui/loading-button';
import { Button } from '@/components/ui/button';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useCreateQuote } from '@/hooks/useQuotes';
import { useActiveContractFor } from '@/hooks/useContracts';
import { Badge } from '@/components/ui/badge';
import { FileSignature } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requestId: string;
  defaultQuantidade?: number;
}

export function QuoteFormModal({ open, onOpenChange, requestId, defaultQuantidade }: Props) {
  const { data: suppliers = [] } = useSuppliers();
  const create = useCreateQuote();
  const { toast } = useToast();

  const [supplierId, setSupplierId] = useState('');
  const [valorUnitario, setValorUnitario] = useState('');
  const [quantidade, setQuantidade] = useState(String(defaultQuantidade ?? ''));
  const [prazo, setPrazo] = useState('');
  const [condicao, setCondicao] = useState('');
  const [obs, setObs] = useState('');

  const ativos = suppliers.filter(s => s.ativo);
  const { data: activeContract } = useActiveContractFor(supplierId);

  const submit = async () => {
    if (!supplierId) return toast({ title: 'Selecione o fornecedor', variant: 'destructive' });
    const vu = Number(valorUnitario.replace(',', '.'));
    const qt = Number(quantidade.replace(',', '.'));
    if (!(vu >= 0) || !(qt > 0)) return toast({ title: 'Valor/quantidade inválidos', variant: 'destructive' });
    await create.mutateAsync({
      request_id: requestId,
      supplier_id: supplierId,
      valor_unitario: vu,
      quantidade: qt,
      prazo_entrega_dias: prazo ? Number(prazo) : null,
      condicao_pagamento: condicao || null,
      observacoes: obs || null,
    });
    onOpenChange(false);
    setSupplierId(''); setValorUnitario(''); setPrazo(''); setCondicao(''); setObs('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova cotação</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Fornecedor</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {ativos.map(s => <SelectItem key={s.id} value={s.id}>{s.nome_fantasia}</SelectItem>)}
              </SelectContent>
            </Select>
            {activeContract && (
              <Badge variant="outline" className="mt-2 bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                <FileSignature className="h-3 w-3 mr-1" />
                Contrato {activeContract.numero} ativo até {activeContract.fim}
                {activeContract.desconto_percent ? ` · ${activeContract.desconto_percent}% desconto` : ''}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor unitário (R$)</Label>
              <Input value={valorUnitario} onChange={e => setValorUnitario(e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input value={quantidade} onChange={e => setQuantidade(e.target.value)} inputMode="decimal" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prazo entrega (dias)</Label>
              <Input value={prazo} onChange={e => setPrazo(e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <Label>Condição de pagamento</Label>
              <Input value={condicao} onChange={e => setCondicao(e.target.value)} placeholder="Ex.: 30 dias" />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <LoadingButton loading={create.isPending} onClick={submit}>Salvar cotação</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
