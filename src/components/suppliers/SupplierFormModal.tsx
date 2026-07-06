import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingButton } from '@/components/ui/loading-button';
import { Button } from '@/components/ui/button';
import { useUpsertSupplier, type Supplier } from '@/hooks/useSuppliers';
import { formatPhoneBR } from '@/lib/masks';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  nome_fantasia: z.string().trim().min(2, 'Nome obrigatório').max(120),
  razao_social: z.string().trim().max(160).optional().or(z.literal('')),
  cnpj: z.string().trim().max(20).optional().or(z.literal('')),
  categoria: z.string().trim().max(60).optional().or(z.literal('')),
  contato_nome: z.string().trim().max(120).optional().or(z.literal('')),
  telefone: z.string().trim().max(30).optional().or(z.literal('')),
  whatsapp: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().trim().email('E-mail inválido').max(160).optional().or(z.literal('')),
  endereco: z.string().trim().max(240).optional().or(z.literal('')),
  observacoes: z.string().trim().max(1000).optional().or(z.literal('')),
  avaliacao: z.number().int().min(1).max(5).nullable().optional(),
  ativo: z.boolean(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplier?: Supplier | null;
}

const empty = {
  nome_fantasia: '', razao_social: '', cnpj: '', categoria: '',
  contato_nome: '', telefone: '', whatsapp: '', email: '', endereco: '',
  observacoes: '', avaliacao: null as number | null, ativo: true,
};

export function SupplierFormModal({ open, onOpenChange, supplier }: Props) {
  const [form, setForm] = useState(empty);
  const upsert = useUpsertSupplier();
  const { toast } = useToast();

  useEffect(() => {
    if (supplier) {
      setForm({
        nome_fantasia: supplier.nome_fantasia ?? '',
        razao_social: supplier.razao_social ?? '',
        cnpj: supplier.cnpj ?? '',
        categoria: supplier.categoria ?? '',
        contato_nome: supplier.contato_nome ?? '',
        telefone: supplier.telefone ?? '',
        whatsapp: supplier.whatsapp ?? '',
        email: supplier.email ?? '',
        endereco: supplier.endereco ?? '',
        observacoes: supplier.observacoes ?? '',
        avaliacao: supplier.avaliacao,
        ativo: supplier.ativo,
      });
    } else setForm(empty);
  }, [supplier, open]);

  const set = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: 'Dados inválidos', description: parsed.error.issues[0].message, variant: 'destructive' });
      return;
    }
    const cleaned: any = Object.fromEntries(
      Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v]),
    );
    await upsert.mutateAsync(supplier ? { id: supplier.id, ...cleaned } : cleaned);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Nome fantasia *</Label>
            <Input value={form.nome_fantasia} onChange={e => set('nome_fantasia', e.target.value)} />
          </div>
          <div>
            <Label>Razão social</Label>
            <Input value={form.razao_social} onChange={e => set('razao_social', e.target.value)} />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input value={form.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input value={form.categoria} onChange={e => set('categoria', e.target.value)} placeholder="Ex.: Material de escritório" />
          </div>
          <div>
            <Label>Avaliação</Label>
            <Select value={form.avaliacao?.toString() ?? 'none'} onValueChange={v => set('avaliacao', v === 'none' ? null : Number(v))}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem avaliação</SelectItem>
                {[1,2,3,4,5].map(n => <SelectItem key={n} value={n.toString()}>{'★'.repeat(n)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Contato</Label>
            <Input value={form.contato_nome} onChange={e => set('contato_nome', e.target.value)} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={formatPhoneBR(form.telefone)} onChange={e => set('telefone', formatPhoneBR(e.target.value))} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input value={formatPhoneBR(form.whatsapp)} onChange={e => set('whatsapp', formatPhoneBR(e.target.value))} placeholder="(00) 00000-0000" />
          </div>
          <div className="md:col-span-2">
            <Label>Endereço</Label>
            <Input value={form.endereco} onChange={e => set('endereco', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea rows={3} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.ativo} onCheckedChange={v => set('ativo', v)} />
            <Label>Ativo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <LoadingButton loading={upsert.isPending} onClick={submit}>Salvar</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
