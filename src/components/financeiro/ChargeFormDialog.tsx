import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useUpsertCharge } from '@/hooks/useFinance';
import { useStudents, useCourses } from '@/hooks/useAcademicData';
import { useAuth } from '@/hooks/useAuth';
import { CHARGE_STATUS_LABEL, toMonthRef } from '@/lib/finance';

export function ChargeFormDialog({ row, trigger, studentId }: { row?: any; trigger: React.ReactNode; studentId?: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const { user } = useAuth();
  const { data: students = [] } = useStudents();
  const { data: courses = [] } = useCourses();
  const upsert = useUpsertCharge();

  useEffect(() => {
    if (open) {
      const today = new Date();
      setForm(row ? { ...row } : {
        student_id: studentId ?? '',
        reference_month: toMonthRef(today),
        due_date: new Date(today.getFullYear(), today.getMonth(), 10).toISOString().slice(0, 10),
        base_amount: 0,
        discount_amount: 0,
        status: 'pendente',
      });
    }
  }, [open, row, studentId]);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.student_id || !form.reference_month || !form.due_date) return toast({ title: 'Preencha aluno, mês e vencimento', variant: 'destructive' });
    try {
      const { id, student, course, net_amount, created_at, updated_at, ...values } = form;
      values.base_amount = Number(values.base_amount) || 0;
      values.discount_amount = Number(values.discount_amount) || 0;
      values.course_id = values.course_id || null;
      if (!row) values.created_by = user?.id ?? null;
      await upsert.mutateAsync({ id: row?.id, values });
      toast({ title: row ? 'Cobrança atualizada' : 'Cobrança criada' });
      setOpen(false);
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{row ? 'Editar cobrança' : 'Nova cobrança'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label>Aluno *</Label>
            <Select value={form.student_id ?? ''} onValueChange={(v) => set('student_id', v)} disabled={!!studentId || !!row}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.registration}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Curso</Label>
            <Select value={form.course_id ?? 'none'} onValueChange={(v) => set('course_id', v === 'none' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent><SelectItem value="none">Nenhum</SelectItem>{courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Mês de referência *</Label><Input type="month" value={form.reference_month?.slice(0, 7) ?? ''} onChange={(e) => set('reference_month', e.target.value ? `${e.target.value}-01` : '')} /></div>
          <div><Label>Vencimento *</Label><Input type="date" value={form.due_date ?? ''} onChange={(e) => set('due_date', e.target.value)} /></div>
          <div><Label>Status</Label>
            <Select value={form.status ?? 'pendente'} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(CHARGE_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Valor base (R$) *</Label><Input type="number" step="0.01" value={form.base_amount ?? 0} onChange={(e) => set('base_amount', e.target.value)} /></div>
          <div><Label>Desconto (R$)</Label><Input type="number" step="0.01" value={form.discount_amount ?? 0} onChange={(e) => set('discount_amount', e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Descrição</Label><Input value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Ex.: Mensalidade — Março/2026" /></div>
          <div className="md:col-span-2"><Label>Observações</Label><Textarea rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={upsert.isPending}>{upsert.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
