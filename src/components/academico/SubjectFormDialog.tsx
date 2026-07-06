import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useUpsert, useCourses, useProfessors } from '@/hooks/useAcademicData';

export function SubjectFormDialog({ row, trigger, defaultCourseId, defaultSemester }: { row?: any; trigger: React.ReactNode; defaultCourseId?: string; defaultSemester?: number; }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const { data: courses = [] } = useCourses();
  const { data: professors = [] } = useProfessors();
  const upsert = useUpsert('subjects', ['subjects']);

  useEffect(() => {
    if (open) setForm(row ? { ...row } : { status: 'active', workload_hours: 60, semester: defaultSemester ?? 1, course_id: defaultCourseId });
  }, [open, row, defaultCourseId, defaultSemester]);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.code) return toast({ title: 'Preencha nome e código', variant: 'destructive' });
    try {
      const { id, course, professor, created_at, updated_at, ...values } = form;
      values.workload_hours = Number(values.workload_hours) || 60;
      values.semester = Number(values.semester) || 1;
      await upsert.mutateAsync({ id: row?.id, values });
      toast({ title: row ? 'Disciplina atualizada' : 'Disciplina cadastrada' });
      setOpen(false);
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{row ? 'Editar disciplina' : 'Nova disciplina'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label>Nome *</Label><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></div>
          <div><Label>Código *</Label><Input value={form.code ?? ''} onChange={(e) => set('code', e.target.value)} /></div>
          <div><Label>Carga horária</Label><Input type="number" value={form.workload_hours ?? 60} onChange={(e) => set('workload_hours', e.target.value)} /></div>
          <div><Label>Semestre</Label><Input type="number" min={1} max={12} value={form.semester ?? 1} onChange={(e) => set('semester', e.target.value)} /></div>
          <div><Label>Curso</Label>
            <Select value={form.course_id ?? 'none'} onValueChange={(v) => set('course_id', v === 'none' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Professor (opcional)</Label>
            <Select value={form.professor_id ?? 'none'} onValueChange={(v) => set('professor_id', v === 'none' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {professors.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={form.status ?? 'active'} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
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
