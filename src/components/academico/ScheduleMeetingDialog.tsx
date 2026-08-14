import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, Clock3, Loader2, MapPinned, Trash2, UserRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IconSelect, type IconSelectOption } from '@/components/ui/icon-select';
import { ConfirmDeleteDialog } from '@/components/academico/ConfirmDeleteDialog';
import { useClasses, useProfessors } from '@/hooks/useAcademicData';
import { useRooms } from '@/hooks/useRooms';
import { useCancelAcademicMeeting, useUpsertAcademicMeeting } from '@/hooks/useAcademicSchedules';
import type { InstitutionalClass, InstitutionalSchedule } from '@/components/academico/InstitutionalScheduleGrid';
import { toast } from '@/hooks/use-toast';

type SlotSelection = { day: number; start: string; end: string; ead?: boolean };

interface ScheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: InstitutionalSchedule;
  entry?: InstitutionalClass;
  slot?: SlotSelection;
}

const dayOptions: IconSelectOption[] = [
  { value: '1', label: 'Segunda-feira', icon: CalendarDays },
  { value: '2', label: 'Terça-feira', icon: CalendarDays },
  { value: '3', label: 'Quarta-feira', icon: CalendarDays },
  { value: '4', label: 'Quinta-feira', icon: CalendarDays },
  { value: '5', label: 'Sexta-feira', icon: CalendarDays },
  { value: '7', label: 'EAD', icon: BookOpen, iconClassName: 'text-sky-600' },
];

export function ScheduleMeetingDialog({ open, onOpenChange, schedule, entry, slot }: ScheduleMeetingDialogProps) {
  const [form, setForm] = useState({ classId: '', professorId: 'none', roomId: 'none', day: '1', start: '07:10', end: '08:00', notes: '' });
  const { data: classes = [] } = useClasses({ courseId: schedule.courseId, period: schedule.academicPeriod });
  const { data: professors = [] } = useProfessors();
  const { data: rooms = [] } = useRooms();
  const upsert = useUpsertAcademicMeeting();
  const cancel = useCancelAcademicMeeting();

  useEffect(() => {
    if (!open) return;
    setForm({
      classId: entry?.classId ?? '',
      professorId: entry?.professorId ?? 'none',
      roomId: entry?.roomId ?? 'none',
      day: String(entry?.day ?? slot?.day ?? 1),
      start: entry?.start ?? slot?.start ?? '07:10',
      end: entry?.end ?? slot?.end ?? '08:00',
      notes: '',
    });
  }, [entry, open, slot]);

  useEffect(() => {
    if (open && !form.classId && classes[0]?.id) setForm((current) => ({ ...current, classId: classes[0].id }));
  }, [classes, form.classId, open]);

  const classOptions = useMemo<IconSelectOption[]>(() => classes.map((item: any) => ({
    value: item.id,
    label: `${item.subject?.name ?? item.name} · ${item.code}`,
    icon: BookOpen,
    iconClassName: 'text-violet-600',
  })), [classes]);
  const professorOptions = useMemo<IconSelectOption[]>(() => [
    { value: 'none', label: 'Professor ainda não definido', icon: UserRound },
    ...professors.map((item: any) => ({ value: item.id, label: item.full_name, icon: UserRound, iconClassName: 'text-sky-600' })),
  ], [professors]);
  const roomOptions = useMemo<IconSelectOption[]>(() => [
    { value: 'none', label: 'Sala ainda não definida', icon: MapPinned },
    ...rooms.map((item: any) => ({ value: item.id, label: `${item.code} · ${item.name} (${item.capacity} lugares)`, icon: MapPinned, iconClassName: 'text-emerald-600' })),
  ], [rooms]);

  const isEad = form.day === '7';
  const isSaving = upsert.isPending || cancel.isPending;

  const save = async () => {
    if (!schedule.id || !form.classId) {
      toast({ title: 'Selecione uma turma', description: 'A aula precisa estar vinculada a uma turma cadastrada.', variant: 'destructive' });
      return;
    }
    if (form.end <= form.start) {
      toast({ title: 'Horário inválido', description: 'O término precisa ser posterior ao início.', variant: 'destructive' });
      return;
    }
    try {
      await upsert.mutateAsync({
        id: entry?.id,
        values: {
          academic_schedule_id: schedule.id,
          class_id: form.classId,
          professor_id: form.professorId === 'none' ? null : form.professorId,
          room_id: isEad || form.roomId === 'none' ? null : form.roomId,
          weekday: Number(form.day),
          starts_at: isEad ? '00:01' : form.start,
          ends_at: isEad ? '23:59' : form.end,
          status: schedule.status === 'published' ? 'published' : 'planned',
          notes: form.notes || null,
        },
      });
      toast({ title: entry ? 'Aula atualizada' : 'Aula adicionada', description: 'A grade já foi atualizada.' });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Não foi possível salvar', description: error.message, variant: 'destructive' });
    }
  };

  const remove = async () => {
    if (!entry?.id) return;
    try {
      await cancel.mutateAsync(entry.id);
      toast({ title: 'Aula removida da grade' });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Não foi possível remover', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? 'Editar aula' : 'Adicionar aula'}</DialogTitle>
          <DialogDescription>{schedule.course} · {schedule.classCode} · {schedule.academicPeriod}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Turma e disciplina *</Label>
            <IconSelect value={form.classId} onValueChange={(classId) => setForm((current) => ({ ...current, classId }))} options={classOptions} placeholder="Selecione a turma" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Professor</Label><IconSelect value={form.professorId} onValueChange={(professorId) => setForm((current) => ({ ...current, professorId }))} options={professorOptions} /></div>
            <div className="space-y-1.5"><Label>Sala</Label><IconSelect value={form.roomId} onValueChange={(roomId) => setForm((current) => ({ ...current, roomId }))} options={roomOptions} disabled={isEad} /></div>
          </div>
          <div className="space-y-1.5"><Label>Dia</Label><IconSelect value={form.day} onValueChange={(day) => setForm((current) => ({ ...current, day }))} options={dayOptions} /></div>
          {!isEad && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/20 p-3">
              <div className="space-y-1.5"><Label className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />Início</Label><Input type="time" value={form.start} onChange={(event) => setForm((current) => ({ ...current, start: event.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />Término</Label><Input type="time" value={form.end} onChange={(event) => setForm((current) => ({ ...current, end: event.target.value }))} /></div>
            </div>
          )}
          <div className="space-y-1.5"><Label>Observações</Label><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Informação opcional para a coordenação" /></div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {entry?.id && (
              <ConfirmDeleteDialog
                title="Remover esta aula?"
                description="A aula deixará de aparecer na grade, mas continuará registrada no histórico."
                onConfirm={remove}
                trigger={<Button type="button" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="mr-1 h-4 w-4" />Remover</Button>}
              />
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" onClick={save} disabled={isSaving || classOptions.length === 0}>{isSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Salvar aula</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
