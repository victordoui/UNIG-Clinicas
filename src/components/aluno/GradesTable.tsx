import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Info } from 'lucide-react';

interface Props {
  enrollments: any[];
}

export function GradesTable({ enrollments }: Props) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-3 border-b bg-muted/30 flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          Aguardando lançamento pelo professor. Os valores aparecerão aqui automaticamente.
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Disciplina</TableHead>
              <TableHead className="text-center">AV1</TableHead>
              <TableHead className="text-center">AV2</TableHead>
              <TableHead className="text-center">AV3</TableHead>
              <TableHead className="text-center">Média</TableHead>
              <TableHead className="text-center">Frequência</TableHead>
              <TableHead className="text-center">Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma disciplina matriculada.
                </TableCell>
              </TableRow>
            )}
            {enrollments.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <div className="font-medium">{e.class?.subject?.name ?? e.class?.name}</div>
                  <div className="text-xs text-muted-foreground">{e.class?.code}</div>
                </TableCell>
                <TableCell className="text-center text-muted-foreground">—</TableCell>
                <TableCell className="text-center text-muted-foreground">—</TableCell>
                <TableCell className="text-center text-muted-foreground">—</TableCell>
                <TableCell className="text-center text-muted-foreground">—</TableCell>
                <TableCell className="text-center text-muted-foreground">—</TableCell>
                <TableCell className="text-center text-muted-foreground">Em curso</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
