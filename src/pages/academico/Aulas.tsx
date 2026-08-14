import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Eye, PencilLine, Plus, Printer, School, ShieldCheck, Sparkles } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCanReadAcademic, useCanWriteAcademic } from '@/components/academico/StaffOnly';
import { InstitutionalScheduleGrid, type InstitutionalClass } from '@/components/academico/InstitutionalScheduleGrid';
import { ScheduleMeetingDialog } from '@/components/academico/ScheduleMeetingDialog';
import { CreateScheduleDialog } from '@/components/academico/CreateScheduleDialog';
import { usePublishedAcademicSchedules } from '@/hooks/useAcademicSchedules';
import { TEST_SCHEDULES } from '@/lib/testSchedules';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IconSelect, type IconSelectOption } from '@/components/ui/icon-select';
import { cn } from '@/lib/utils';

type SlotSelection = { day: number; start: string; end: string; ead?: boolean };
type EditorSelection = { entry?: InstitutionalClass; slot?: SlotSelection };

const scheduleKey = (schedule: { id?: string; classCode: string; shift: string }) => schedule.id ?? `demo:${schedule.classCode}:${schedule.shift}`;

export default function Aulas() {
  const canRead = useCanReadAcademic();
  const canWrite = useCanWriteAcademic();
  const { data: remoteSchedules = [], isLoading } = usePublishedAcademicSchedules(canWrite);
  const schedules = remoteSchedules.length > 0 ? remoteSchedules : TEST_SCHEDULES;
  const [selectedKey, setSelectedKey] = useState(() => scheduleKey(schedules[0]));
  const [editMode, setEditMode] = useState(false);
  const [editorSelection, setEditorSelection] = useState<EditorSelection | null>(null);
  const selected = schedules.find((schedule) => scheduleKey(schedule) === selectedKey) ?? schedules[0];

  useEffect(() => {
    if (!schedules.some((schedule) => scheduleKey(schedule) === selectedKey)) setSelectedKey(scheduleKey(schedules[0]));
  }, [schedules, selectedKey]);

  useEffect(() => {
    setEditMode(false);
    setEditorSelection(null);
  }, [selectedKey]);

  const scheduleOptions = useMemo<IconSelectOption[]>(() => schedules.map((item) => ({
    value: scheduleKey(item),
    label: `${item.course} · ${item.classCode} · ${item.semester}`,
    icon: item.id ? School : Sparkles,
    iconClassName: item.status === 'draft' ? 'text-amber-600' : item.id ? 'text-sky-600' : 'text-violet-600',
  })), [schedules]);

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;

  const canEditSelected = canWrite && !!selected.id;

  return (
    <MainLayout>
      <div className="schedule-page space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarDays className="h-6 w-6 text-primary" />Grade de Aulas</h1>
            <p className="text-sm text-muted-foreground">Visualize, monte e imprima a semana da turma em um único lugar.</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {canWrite && <CreateScheduleDialog trigger={<Button variant="outline" className="flex-1 sm:flex-none"><Plus className="mr-1.5 h-4 w-4" />Nova grade</Button>} />}
            {canWrite && (
              <Button
                variant={editMode ? 'default' : 'outline'}
                disabled={!canEditSelected}
                onClick={() => setEditMode((current) => !current)}
                className="flex-1 sm:flex-none"
                title={!selected.id ? 'A prévia demonstrativa não pode ser alterada' : undefined}
              >
                <PencilLine className="mr-1.5 h-4 w-4" />{editMode ? 'Concluir edição' : 'Editar grade'}
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()} className="flex-1 sm:flex-none"><Printer className="mr-1.5 h-4 w-4" />Imprimir grade</Button>
          </div>
        </div>

        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_260px] print:hidden">
          <IconSelect value={selectedKey} onValueChange={setSelectedKey} options={scheduleOptions} aria-label="Selecionar turma" />
          <div className="flex min-h-10 items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm">
            <span className="font-medium">{selected.academicPeriod} · {selected.shift}</span>
            {selected.status && <Badge variant="outline" className={cn(selected.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>{selected.status === 'published' ? 'Publicada' : 'Rascunho'}</Badge>}
          </div>
        </div>

        <div className={cn(
          'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs print:hidden',
          editMode ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-600',
        )}>
          {editMode ? <PencilLine className="mt-0.5 h-4 w-4 shrink-0" /> : canWrite ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <Eye className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>
            {editMode
              ? 'Modo de edição ativo: toque em um horário vazio para adicionar uma aula ou em uma disciplina para alterar professor, sala e horário.'
              : remoteSchedules.length > 0
                ? canWrite ? 'Você tem permissão de edição. Ative “Editar grade” quando precisar fazer alterações.' : 'Seu acesso é somente para visualização desta grade.'
                : isLoading ? 'Carregando grades do sistema…' : 'Prévia demonstrativa: conecte dados publicados para habilitar a edição.'}
          </span>
        </div>

        <InstitutionalScheduleGrid
          schedule={selected}
          editable={editMode && canEditSelected}
          onEntryClick={(entry) => setEditorSelection({ entry })}
          onEmptySlotClick={(slot) => setEditorSelection({ slot })}
        />

        {selected.id && editorSelection && (
          <ScheduleMeetingDialog
            open
            onOpenChange={(open) => { if (!open) setEditorSelection(null); }}
            schedule={selected}
            entry={editorSelection.entry}
            slot={editorSelection.slot}
          />
        )}
      </div>
    </MainLayout>
  );
}
