import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { ScheduleSlot } from '@/lib/academic';

const DAYS = [
  { idx: 1, label: 'Segunda' }, { idx: 2, label: 'Terça' }, { idx: 3, label: 'Quarta' },
  { idx: 4, label: 'Quinta' }, { idx: 5, label: 'Sexta' }, { idx: 6, label: 'Sábado' }, { idx: 0, label: 'Domingo' },
];

export function ClassScheduleEditor({ value = [], onChange }: { value?: ScheduleSlot[]; onChange: (v: ScheduleSlot[]) => void }) {
  const update = (idx: number, patch: Partial<ScheduleSlot>) => {
    onChange(value.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const add = () => onChange([...value, { day: 1, start: '19:00', end: '22:30' }]);

  return (
    <div className="space-y-2">
      {value.length === 0 && <p className="text-xs text-muted-foreground">Nenhum horário definido.</p>}
      {value.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <Select value={String(s.day)} onValueChange={(v) => update(i, { day: Number(v) })}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAYS.map((d) => <SelectItem key={d.idx} value={String(d.idx)}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="time" value={s.start} onChange={(e) => update(i, { start: e.target.value })} className="w-[110px]" />
          <span className="text-muted-foreground text-sm">até</span>
          <Input type="time" value={s.end} onChange={(e) => update(i, { end: e.target.value })} className="w-[110px]" />
          <Button size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add}><Plus className="h-4 w-4 mr-1" />Adicionar horário</Button>
    </div>
  );
}
