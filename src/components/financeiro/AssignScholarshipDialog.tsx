import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAssignScholarship, useScholarships } from '@/hooks/useFinance';
import { useStudents } from '@/hooks/useAcademicData';
import { useAuth } from '@/hooks/useAuth';

export function AssignScholarshipDialog({ trigger, studentId }: { trigger: React.ReactNode; studentId?: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const { user } = useAuth();
  const { data: scholarships = [] } = useScholarships(true);
  const { data: students = [] } = useStudents();
  const assign = useAssignScholarship();

  useEffect(() => {
    if (open) setForm({ status: 'ativa', starts_at: new Date().toISOString().slice(0, 10), student_id: studentId ?? '', scholarship_id: '' });
  }, [open, studentId]);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.student_id || !form.scholarship_id) return toast({ title: 'Selecione aluno e programa', variant: 'destructive' });
    try {
      await assign.mutateAsync({ ...form, granted_by: user?.id ?? null });
      toast({ title: 'Bolsa vinculada' });
      setOpen(false);
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Vincular bolsa a aluno</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label>Aluno *</Label>
            <Select value={form.student_id ?? ''} onValueChange={(v) => set('student_id', v)} disabled={!!studentId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.registration}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Programa *</Label>
            <Select value={form.scholarship_id ?? ''} onValueChange={(v) => set('scholarship_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{scholarships.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Início</Label><Input type="date" value={form.starts_at ?? ''} onChange={(e) => set('starts_at', e.target.value)} /></div>
          <div><Label>Fim</Label><Input type="date" value={form.ends_at ?? ''} onChange={(e) => set('ends_at', e.target.value || null)} /></div>
          <div className="md:col-span-2"><Label>Status</Label>
            <Select value={form.status ?? 'ativa'} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="suspensa">Suspensa</SelectItem>
                <SelectItem value="encerrada">Encerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Observações</Label><Textarea rows={3} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={assign.isPending}>{assign.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Vincular</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
