import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { PERIOD_LABEL, type Filters, type PeriodPreset } from '@/lib/reports';

interface Option { id: string; name: string; }

interface Props {
  value: Filters;
  onChange: (v: Filters) => void;
  courses?: Option[];
  classes?: Option[];
  units?: Option[];
  categories?: Option[];
  statuses?: { value: string; label: string }[];
}

const ALL = '__all__';

export function ReportFilters({ value, onChange, courses, classes, units, categories, statuses }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  const norm = (v: string) => (v === ALL ? undefined : v);

  return (
    <Card>
      <CardContent className="p-4 grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
        <div>
          <Label className="text-xs">Período</Label>
          <Select value={value.preset} onValueChange={v => set({ preset: v as PeriodPreset })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABEL) as PeriodPreset[]).map(k => (
                <SelectItem key={k} value={k}>{PERIOD_LABEL[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {value.preset === 'custom' && (
          <>
            <div>
              <Label className="text-xs">De</Label>
              <Input type="date" value={value.from?.slice(0, 10) ?? ''} onChange={e => set({ from: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
            </div>
            <div>
              <Label className="text-xs">Até</Label>
              <Input type="date" value={value.to?.slice(0, 10) ?? ''} onChange={e => set({ to: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : undefined })} />
            </div>
          </>
        )}
        {courses && (
          <div>
            <Label className="text-xs">Curso</Label>
            <Select value={value.courseId ?? ALL} onValueChange={v => set({ courseId: norm(v), classId: undefined })}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {classes && (
          <div>
            <Label className="text-xs">Turma</Label>
            <Select value={value.classId ?? ALL} onValueChange={v => set({ classId: norm(v) })}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {units && (
          <div>
            <Label className="text-xs">Unidade</Label>
            <Select value={value.unitId ?? ALL} onValueChange={v => set({ unitId: norm(v) })}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {categories && (
          <div>
            <Label className="text-xs">Categoria</Label>
            <Select value={value.categoryId ?? ALL} onValueChange={v => set({ categoryId: norm(v) })}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {statuses && (
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={value.status ?? ALL} onValueChange={v => set({ status: norm(v) })}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
