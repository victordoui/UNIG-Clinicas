import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useBulkGenerateCharges } from '@/hooks/useFinance';
import { useCourses } from '@/hooks/useAcademicData';
import { toMonthRef } from '@/lib/finance';

export function BulkChargeGeneratorDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const { data: courses = [] } = useCourses();
  const bulk = useBulkGenerateCharges();

  useEffect(() => {
    if (open) {
      const t = new Date();
      setForm({
        courseId: '',
        referenceMonth: toMonthRef(t),
        dueDate: new Date(t.getFullYear(), t.getMonth(), 10).toISOString().slice(0, 10),
        baseAmount: 1200,
        description: '',
      });
    }
  }, [open]);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.courseId || !form.referenceMonth || !form.dueDate || !form.baseAmount) {
      return toast({ title: 'Preencha curso, mês, vencimento e valor', variant: 'destructive' });
    }
    try {
      const r = await bulk.mutateAsync({
        courseId: form.courseId,
        referenceMonth: form.referenceMonth,
        dueDate: form.dueDate,
        baseAmount: Number(form.baseAmount),
        description: form.description || undefined,
      });
      toast({ title: `Cobranças geradas: ${r.inserted}`, description: r.skipped ? `${r.skipped} alunos já tinham cobrança nesse mês.` : undefined });
      setOpen(false);
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Gerar mensalidades em lote</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label>Curso *</Label>
            <Select value={form.courseId ?? ''} onValueChange={(v) => set('courseId', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Mês *</Label><Input type="month" value={form.referenceMonth?.slice(0, 7) ?? ''} onChange={(e) => set('referenceMonth', e.target.value ? `${e.target.value}-01` : '')} /></div>
          <div><Label>Vencimento *</Label><Input type="date" value={form.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Valor base (R$) *</Label><Input type="number" step="0.01" value={form.baseAmount ?? 0} onChange={(e) => set('baseAmount', e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Descrição</Label><Textarea rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Ex.: Mensalidade — Março/2026" /></div>
        </div>
        <p className="text-xs text-muted-foreground">As bolsas ativas dos alunos serão aplicadas automaticamente. Alunos que já possuem cobrança nesse mês serão ignorados.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={bulk.isPending}>{bulk.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Gerar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
