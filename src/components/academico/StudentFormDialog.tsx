import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useUpsert, useCourses, useUnits } from '@/hooks/useAcademicData';

interface Props { row?: any; trigger: React.ReactNode; }

export function StudentFormDialog({ row, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const { data: courses = [] } = useCourses();
  const { data: units = [] } = useUnits();
  const upsert = useUpsert('students', ['students']);

  useEffect(() => {
    if (open) setForm(row ? { ...row } : { enrollment_status: 'ativa', admission_period: '2026.1' });
  }, [open, row]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.full_name || !form.registration || !form.email) {
      return toast({ title: 'Preencha nome, matrícula e e-mail', variant: 'destructive' });
    }
    try {
      const { id, course, unit, created_at, updated_at, ...values } = form;
      await upsert.mutateAsync({ id: row?.id, values });
      toast({ title: row ? 'Aluno atualizado' : 'Aluno cadastrado' });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{row ? 'Editar aluno' : 'Novo aluno'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label>Nome completo *</Label><Input value={form.full_name ?? ''} onChange={(e) => set('full_name', e.target.value)} maxLength={200} /></div>
          <div><Label>Matrícula *</Label><Input value={form.registration ?? ''} onChange={(e) => set('registration', e.target.value)} maxLength={30} /></div>
          <div><Label>E-mail *</Label><Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} maxLength={200} /></div>
          <div><Label>Telefone</Label><Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} maxLength={30} /></div>
          <div><Label>CPF/Documento</Label><Input value={form.document_number ?? ''} onChange={(e) => set('document_number', e.target.value)} maxLength={30} /></div>
          <div><Label>Data de nascimento</Label><Input type="date" value={form.birth_date ?? ''} onChange={(e) => set('birth_date', e.target.value || null)} /></div>
          <div><Label>Período de ingresso *</Label><Input value={form.admission_period ?? ''} onChange={(e) => set('admission_period', e.target.value)} placeholder="2026.1" /></div>
          <div>
            <Label>Curso</Label>
            <Select value={form.course_id ?? 'none'} onValueChange={(v) => set('course_id', v === 'none' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unidade</Label>
            <Select value={form.unit_id ?? 'none'} onValueChange={(v) => set('unit_id', v === 'none' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.enrollment_status ?? 'ativa'} onValueChange={(v) => set('enrollment_status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="trancada">Trancada</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={upsert.isPending}>{upsert.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
