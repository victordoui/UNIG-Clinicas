import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { ASSESSMENTS, computeAverage, computeSituation, formatScore, Assessment } from '@/lib/grades';
import { SituationBadge } from './SituationBadge';
import { useUpsertGrade, usePublishGrades } from '@/hooks/useGrades';

interface Props {
  enrollments: any[];
  grades: any[];
  attendance: any[];
}

export function GradeEntryTable({ enrollments, grades, attendance }: Props) {
  const upsert = useUpsertGrade();
  const publish = usePublishGrades();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const key = (eid: string, a: Assessment) => `${eid}:${a}`;

  const getVal = (eid: string, a: Assessment) => {
    const k = key(eid, a);
    if (draft[k] !== undefined) return draft[k];
    const g = grades.find((x) => x.enrollment_id === eid && x.assessment === a);
    return g?.score != null ? String(g.score) : '';
  };

  const save = async (eid: string, a: Assessment) => {
    const raw = draft[key(eid, a)];
    if (raw === undefined) return;
    const num = raw.trim() === '' ? null : Number(raw.replace(',', '.'));
    if (num != null && (Number.isNaN(num) || num < 0 || num > 10)) return;
    await upsert.mutateAsync({ enrollment_id: eid, assessment: a, score: num });
    setDraft((d) => { const c = { ...d }; delete c[key(eid, a)]; return c; });
  };

  const unpublishedIds = useMemo(() => grades.filter((g) => !g.released_at && g.score != null).map((g) => g.id), [grades]);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-3 border-b bg-muted/30 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Digite as notas (0–10) e clique fora para salvar. Publique para liberar aos alunos.
          </div>
          <Button
            size="sm"
            onClick={() => publish.mutate(unpublishedIds)}
            disabled={publish.isPending || unpublishedIds.length === 0}
          >
            {publish.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Publicar {unpublishedIds.length > 0 && `(${unpublishedIds.length})`}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                {ASSESSMENTS.map((a) => <TableHead key={a} className="text-center w-20">{a}</TableHead>)}
                <TableHead className="text-center">Média</TableHead>
                <TableHead className="text-center">Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={ASSESSMENTS.length + 3} className="text-center text-muted-foreground py-8">
                    Nenhum aluno matriculado.
                  </TableCell>
                </TableRow>
              )}
              {enrollments.map((e) => {
                const g = grades.filter((x) => x.enrollment_id === e.id);
                const a = attendance.filter((x) => x.enrollment_id === e.id);
                const previewG = ASSESSMENTS.map((assess) => {
                  const val = getVal(e.id, assess);
                  const num = val.trim() === '' ? null : Number(val.replace(',', '.'));
                  return { enrollment_id: e.id, assessment: assess, score: Number.isFinite(num as number) ? (num as number) : null };
                });
                const avg = computeAverage(previewG);
                const sit = computeSituation(previewG, a);
                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="font-medium">{e.student?.full_name}</div>
                      <div className="text-xs text-muted-foreground">{e.student?.registration}</div>
                    </TableCell>
                    {ASSESSMENTS.map((assess) => (
                      <TableCell key={assess} className="text-center">
                        <Input
                          className="h-8 text-center"
                          value={getVal(e.id, assess)}
                          onChange={(ev) => setDraft((d) => ({ ...d, [key(e.id, assess)]: ev.target.value }))}
                          onBlur={() => save(e.id, assess)}
                          inputMode="decimal"
                          placeholder="—"
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-semibold">{formatScore(avg)}</TableCell>
                    <TableCell className="text-center"><SituationBadge situation={sit} /></TableCell>
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
