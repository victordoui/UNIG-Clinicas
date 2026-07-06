import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Info } from 'lucide-react';
import { SituationBadge } from './SituationBadge';
import {
  ASSESSMENTS,
  computeAverage,
  computeFrequency,
  computeSituation,
  formatScore,
} from '@/lib/grades';

interface Props {
  enrollments: any[];
  grades: any[];
  attendance: any[];
}

export function StudentReportCard({ enrollments, grades, attendance }: Props) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-3 border-b bg-muted/30 flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          As notas aparecem aqui após publicação pelo professor. Frequência mínima: 75%.
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Disciplina</TableHead>
                {ASSESSMENTS.map((a) => (
                  <TableHead key={a} className="text-center">{a}</TableHead>
                ))}
                <TableHead className="text-center">Média</TableHead>
                <TableHead className="text-center">Frequência</TableHead>
                <TableHead className="text-center">Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={ASSESSMENTS.length + 4} className="text-center text-muted-foreground py-8">
                    Nenhuma disciplina matriculada.
                  </TableCell>
                </TableRow>
              )}
              {enrollments.map((e) => {
                const g = grades.filter((x) => x.enrollment_id === e.id);
                const a = attendance.filter((x) => x.enrollment_id === e.id);
                const avg = computeAverage(g);
                const freq = computeFrequency(a);
                const sit = computeSituation(g, a);
                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="font-medium">{e.class?.subject?.name ?? e.class?.name}</div>
                      <div className="text-xs text-muted-foreground">{e.class?.code} · {e.class?.academic_period}</div>
                    </TableCell>
                    {ASSESSMENTS.map((assess) => {
                      const item = g.find((x) => x.assessment === assess);
                      return (
                        <TableCell key={assess} className="text-center">
                          {item ? formatScore(item.score) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-semibold">{formatScore(avg)}</TableCell>
                    <TableCell className="text-center">
                      {freq == null ? <span className="text-muted-foreground">—</span> : `${freq.toFixed(0)}%`}
                    </TableCell>
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
