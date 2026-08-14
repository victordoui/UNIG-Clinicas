import { useEffect, useMemo, useState } from 'react';
import { Building2, CalendarDays, Clock3, GraduationCap, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconSelect, type IconSelectOption } from '@/components/ui/icon-select';
import { useCourses, useUnits } from '@/hooks/useAcademicData';
import { useCreateAcademicSchedule } from '@/hooks/useAcademicSchedules';
import { toast } from '@/hooks/use-toast';

export function CreateScheduleDialog({ trigger, onCreated }: { trigger: React.ReactNode; onCreated?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ unitId: '', courseId: '', academicPeriod: '2026.2', name: '', shift: 'MANHÃ' });
  const { data: units = [] } = useUnits();
  const { data: courses = [] } = useCourses({ unitId: form.unitId || undefined });
  const createSchedule = useCreateAcademicSchedule();

  useEffect(() => {
    if (open && !form.unitId && units[0]?.id) setForm((current) => ({ ...current, unitId: units[0].id }));
  }, [form.unitId, open, units]);

  useEffect(() => {
    if (open && form.unitId && courses.length > 0 && !courses.some((course: any) => course.id === form.courseId)) {
      setForm((current) => ({ ...current, courseId: courses[0].id }));
    }
  }, [courses, form.courseId, form.unitId, open]);

  const unitOptions = useMemo<IconSelectOption[]>(() => units.map((unit: any) => ({ value: unit.id, label: unit.name, icon: Building2, iconClassName: 'text-sky-600' })), [units]);
  const courseOptions = useMemo<IconSelectOption[]>(() => courses.map((course: any) => ({ value: course.id, label: `${course.name} · ${course.code}`, icon: GraduationCap, iconClassName: 'text-violet-600' })), [courses]);
  const shiftOptions: IconSelectOption[] = [
    { value: 'MANHÃ', label: 'Manhã', icon: Clock3, iconClassName: 'text-amber-500' },
    { value: 'TARDE', label: 'Tarde', icon: Clock3, iconClassName: 'text-orange-500' },
    { value: 'NOITE', label: 'Noite', icon: Clock3, iconClassName: 'text-indigo-600' },
  ];

  const submit = async () => {
    if (!form.unitId || !form.courseId || !form.academicPeriod.trim() || !form.name.trim()) {
      toast({ title: 'Preencha os dados obrigatórios', variant: 'destructive' });
      return;
    }
    try {
      const created = await createSchedule.mutateAsync({
        unit_id: form.unitId,
        course_id: form.courseId,
        academic_period: form.academicPeriod.trim(),
        name: `${form.name.trim()} · ${form.shift}`,
      });
      toast({ title: 'Grade criada como rascunho', description: 'Agora selecione os espaços vazios para adicionar as aulas.' });
      setOpen(false);
      onCreated?.(created.id);
    } catch (error: any) {
      toast({ title: 'Não foi possível criar a grade', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova grade de aulas</DialogTitle>
          <DialogDescription>Crie o quadro semanal e depois preencha cada horário diretamente na grade.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Unidade *</Label><IconSelect value={form.unitId} onValueChange={(unitId) => setForm((current) => ({ ...current, unitId, courseId: '' }))} options={unitOptions} placeholder="Selecione a unidade" /></div>
          <div className="space-y-1.5"><Label>Curso *</Label><IconSelect value={form.courseId} onValueChange={(courseId) => setForm((current) => ({ ...current, courseId }))} options={courseOptions} placeholder="Selecione o curso" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Período letivo *</Label><div className="relative"><CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" /><Input value={form.academicPeriod} onChange={(event) => setForm((current) => ({ ...current, academicPeriod: event.target.value }))} placeholder="2026.2" className="pl-9" /></div></div>
            <div className="space-y-1.5"><Label>Turno *</Label><IconSelect value={form.shift} onValueChange={(shift) => setForm((current) => ({ ...current, shift }))} options={shiftOptions} /></div>
          </div>
          <div className="space-y-1.5"><Label>Identificação da turma *</Label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex.: DRM201 · 2º período" /></div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="button" onClick={submit} disabled={createSchedule.isPending}>{createSchedule.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Criar grade</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
