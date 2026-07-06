import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useCIDelivery } from '@/hooks/useCIExtended';
import { LoadingButton } from '@/components/ui/loading-button';
import { Truck, Save } from 'lucide-react';

export function CIDeliveryTab({ ciId }: { ciId: string }) {
  const { data, isLoading, upsert } = useCIDelivery(ciId);
  const [form, setForm] = useState({
    data_prevista: '',
    data_entrega: '',
    recebido_por: '',
    conferido: false,
    observacoes: '',
  });

  useEffect(() => {
    if (data) {
      setForm({
        data_prevista: data.data_prevista ? data.data_prevista.slice(0, 10) : '',
        data_entrega: data.data_entrega ? data.data_entrega.slice(0, 10) : '',
        recebido_por: data.recebido_por ?? '',
        conferido: data.conferido ?? false,
        observacoes: data.observacoes ?? '',
      });
    }
  }, [data]);

  async function save() {
    await upsert.mutateAsync({
      data_prevista: form.data_prevista ? new Date(form.data_prevista).toISOString() : null,
      data_entrega: form.data_entrega ? new Date(form.data_entrega).toISOString() : null,
      recebido_por: form.recebido_por || null,
      conferido: form.conferido,
      observacoes: form.observacoes || null,
    });
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando…</div>;

  return (
    <Card className="p-5 space-y-4 animate-fade-in">
      <h4 className="font-semibold flex items-center gap-2"><Truck className="h-4 w-4 text-primary" />Entrega</h4>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Data prevista</Label>
          <Input type="date" value={form.data_prevista} onChange={e => setForm({ ...form, data_prevista: e.target.value })} />
        </div>
        <div>
          <Label>Data da entrega</Label>
          <Input type="date" value={form.data_entrega} onChange={e => setForm({ ...form, data_entrega: e.target.value })} />
        </div>
        <div>
          <Label>Recebido por</Label>
          <Input value={form.recebido_por} onChange={e => setForm({ ...form, recebido_por: e.target.value })} placeholder="Nome do responsável" />
        </div>
        <div className="flex items-center gap-2 pt-7">
          <Checkbox id="conferido" checked={form.conferido} onCheckedChange={v => setForm({ ...form, conferido: !!v })} />
          <Label htmlFor="conferido" className="cursor-pointer">Material conferido</Label>
        </div>
        <div className="sm:col-span-2">
          <Label>Observações</Label>
          <Textarea rows={3} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end">
        <LoadingButton loading={upsert.isPending} onClick={save}>
          <Save className="h-4 w-4 mr-2" />Salvar entrega
        </LoadingButton>
      </div>
    </Card>
  );
}
