import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, FileText, Loader2, Save } from 'lucide-react';
import { AttendanceStatus, ATTENDANCE_LABEL } from '@/lib/grades';
import { cn } from '@/lib/utils';
import { useUpsertAttendance } from '@/hooks/useGrades';

interface Props {
  enrollments: any[];
  attendance: any[];
}

const STATUSES: { value: AttendanceStatus; icon: any; className: string }[] = [
  { value: 'present', icon: Check, className: 'data-[active=true]:bg-emerald-500 data-[active=true]:text-white' },
  { value: 'absent', icon: X, className: 'data-[active=true]:bg-rose-500 data-[active=true]:text-white' },
  { value: 'justified', icon: FileText, className: 'data-[active=true]:bg-amber-500 data-[active=true]:text-white' },
];

export function AttendanceGrid({ enrollments, attendance }: Props) {
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const upsert = useUpsertAttendance();

  const existingByEnrollment = useMemo(() => {
    const m: Record<string, AttendanceStatus> = {};
    attendance.filter((r) => r.class_date === date).forEach((r) => { m[r.enrollment_id] = r.status; });
    return m;
  }, [attendance, date]);

  const getStatus = (eid: string) => draft[eid] ?? existingByEnrollment[eid];

  const markAllPresent = () => {
    const d: Record<string, AttendanceStatus> = { ...draft };
    enrollments.forEach((e) => { d[e.id] = 'present'; });
    setDraft(d);
  };

  const save = async () => {
    const rows = enrollments
      .map((e) => ({ enrollment_id: e.id, status: draft[e.id] ?? existingByEnrollment[e.id], class_date: date }))
      .filter((r) => !!r.status);
    if (rows.length === 0) return;
    await upsert.mutateAsync(rows as any);
    setDraft({});
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-3 border-b bg-muted/30 flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Data da aula</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-44" />
          </div>
          <Button variant="outline" size="sm" onClick={markAllPresent}>Marcar todos presentes</Button>
          <div className="flex-1" />
          <Button size="sm" onClick={save} disabled={upsert.isPending}>
            {upsert.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-8">Nenhum aluno matriculado.</TableCell>
                </TableRow>
              )}
              {enrollments.map((e) => {
                const status = getStatus(e.id);
                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="font-medium">{e.student?.full_name}</div>
                      <div className="text-xs text-muted-foreground">{e.student?.registration}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        {STATUSES.map((s) => {
                          const Icon = s.icon;
                          const active = status === s.value;
                          return (
                            <Button
                              key={s.value}
                              type="button"
                              size="sm"
                              variant="outline"
                              data-active={active}
                              className={cn('h-8', s.className)}
                              onClick={() => setDraft((d) => ({ ...d, [e.id]: s.value }))}
                            >
                              <Icon className="h-4 w-4 mr-1" />
                              {ATTENDANCE_LABEL[s.value]}
                            </Button>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
