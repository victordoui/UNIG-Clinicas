import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCIPurchaseOrder } from '@/hooks/useCIExtended';
import { LoadingButton } from '@/components/ui/loading-button';
import { FileSignature, Save } from 'lucide-react';

const PO_STATUS = ['emitido', 'aguardando_faturamento', 'faturado', 'cancelado'] as const;

export function CIPurchaseOrderTab({ ciId }: { ciId: string }) {
  const { data, isLoading, upsert } = useCIPurchaseOrder(ciId);
  const [form, setForm] = useState({
    numero_alterdata: '',
    data_emissao: '',
    valor_total: '' as string | number,
    status: 'emitido',
    observacoes: '',
  });

  useEffect(() => {
    if (data) {
      setForm({
        numero_alterdata: data.numero_alterdata ?? '',
        data_emissao: data.data_emissao ? data.data_emissao.slice(0, 10) : '',
        valor_total: data.valor_total ?? '',
        status: data.status ?? 'emitido',
        observacoes: data.observacoes ?? '',
      });
    }
  }, [data]);

  async function save() {
    await upsert.mutateAsync({
      numero_alterdata: form.numero_alterdata || null,
      data_emissao: form.data_emissao ? new Date(form.data_emissao).toISOString() : null,
      valor_total: form.valor_total === '' ? null : Number(form.valor_total),
      status: form.status,
      observacoes: form.observacoes || null,
    });
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando…</div>;

  return (
    <Card className="p-5 space-y-4 animate-fade-in">
      <h4 className="font-semibold flex items-center gap-2"><FileSignature className="h-4 w-4 text-primary" />Pedido Alterdata</h4>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Número Alterdata</Label>
          <Input value={form.numero_alterdata} onChange={e => setForm({ ...form, numero_alterdata: e.target.value })} placeholder="Ex: PO-2026-00123" />
        </div>
        <div>
          <Label>Data de emissão</Label>
          <Input type="date" value={form.data_emissao} onChange={e => setForm({ ...form, data_emissao: e.target.value })} />
        </div>
        <div>
          <Label>Valor total (R$)</Label>
          <Input type="number" step="0.01" value={form.valor_total} onChange={e => setForm({ ...form, valor_total: e.target.value })} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PO_STATUS.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Observações</Label>
          <Textarea rows={3} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end">
        <LoadingButton loading={upsert.isPending} onClick={save}>
          <Save className="h-4 w-4 mr-2" />Salvar pedido
        </LoadingButton>
      </div>
    </Card>
  );
}
