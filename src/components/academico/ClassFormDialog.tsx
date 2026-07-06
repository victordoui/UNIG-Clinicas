import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useUpsert, useCourses, useSubjects, useProfessors, useUnits } from '@/hooks/useAcademicData';
import { ClassScheduleEditor } from './ClassScheduleEditor';

export function ClassFormDialog({ row, trigger }: { row?: any; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const { data: courses = [] } = useCourses();
  const { data: subjects = [] } = useSubjects();
  const { data: professors = [] } = useProfessors();
  const { data: units = [] } = useUnits();
  const upsert = useUpsert('classes', ['classes']);

  useEffect(() => {
    if (open) setForm(row ? { ...row, schedule: row.schedule ?? [] } : { status: 'active', shift: 'noturno', capacity: 40, enrolled_count: 0, schedule: [], academic_period: '2026.1' });
  }, [open, row]);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.code) return toast({ title: 'Preencha nome e código', variant: 'destructive' });
    try {
      const { id, subject, professor, course, unit, created_at, updated_at, ...values } = form;
      values.capacity = Number(values.capacity) || 40;
      values.enrolled_count = Number(values.enrolled_count) || 0;
      await upsert.mutateAsync({ id: row?.id, values });
      toast({ title: row ? 'Turma atualizada' : 'Turma cadastrada' });
      setOpen(false);
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{row ? 'Editar turma' : 'Nova turma'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Nome *</Label><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></div>
          <div><Label>Código *</Label><Input value={form.code ?? ''} onChange={(e) => set('code', e.target.value)} /></div>
          <div><Label>Período letivo *</Label><Input value={form.academic_period ?? ''} onChange={(e) => set('academic_period', e.target.value)} placeholder="2026.1" /></div>
          <div><Label>Turno *</Label>
            <Select value={form.shift ?? 'noturno'} onValueChange={(v) => set('shift', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="matutino">Matutino</SelectItem>
                <SelectItem value="vespertino">Vespertino</SelectItem>
                <SelectItem value="noturno">Noturno</SelectItem>
                <SelectItem value="integral">Integral</SelectItem>
                <SelectItem value="ead">EAD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Disciplina</Label>
            <Select value={form.subject_id ?? 'none'} onValueChange={(v) => set('subject_id', v === 'none' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Professor</Label>
            <Select value={form.professor_id ?? 'none'} onValueChange={(v) => set('professor_id', v === 'none' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {professors.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Curso</Label>
            <Select value={form.course_id ?? 'none'} onValueChange={(v) => set('course_id', v === 'none' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Unidade</Label>
            <Select value={form.unit_id ?? 'none'} onValueChange={(v) => set('unit_id', v === 'none' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Sala</Label><Input value={form.room ?? ''} onChange={(e) => set('room', e.target.value)} /></div>
          <div><Label>Capacidade</Label><Input type="number" value={form.capacity ?? 40} onChange={(e) => set('capacity', e.target.value)} /></div>
          <div><Label>Status</Label>
            <Select value={form.status ?? 'active'} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="inactive">Inativa</SelectItem>
                <SelectItem value="closed">Encerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Horários semanais</Label>
          <ClassScheduleEditor value={form.schedule ?? []} onChange={(v) => set('schedule', v)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={upsert.isPending}>{upsert.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
