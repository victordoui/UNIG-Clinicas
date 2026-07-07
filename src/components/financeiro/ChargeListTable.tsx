import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CheckCircle2, FileText, Pencil, Trash2 } from 'lucide-react';
import { ChargeStatusBadge } from './ChargeStatusBadge';
import { ChargeFormDialog } from './ChargeFormDialog';
import { MarkAsPaidDialog } from './MarkAsPaidDialog';
import { ConfirmDeleteDialog } from '@/components/academico/ConfirmDeleteDialog';
import { formatBRL, formatDate, formatMonthRef } from '@/lib/finance';
import { useIssueSlip } from '@/hooks/useFinance';
import { toast } from '@/hooks/use-toast';

export function ChargeListTable({ rows, canWrite, onDelete }: { rows: any[]; canWrite: boolean; onDelete: (id: string) => void }) {
  const issue = useIssueSlip();
  const emitir = async (chargeId: string) => {
    try { await issue.mutateAsync({ chargeId }); toast({ title: 'Boleto emitido' }); }
    catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  if (rows.length === 0) return <p className="text-sm text-muted-foreground text-center py-10">Nenhuma cobrança encontrada.</p>;

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Aluno</TableHead>
            <TableHead>Referência</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell>
                <div className="font-medium">{c.student?.full_name ?? '—'}</div>
                <div className="text-xs text-muted-foreground">{c.student?.registration}</div>
              </TableCell>
              <TableCell className="capitalize">{formatMonthRef(c.reference_month)}</TableCell>
              <TableCell>{formatDate(c.due_date)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatBRL(c.net_amount)}</TableCell>
              <TableCell><ChargeStatusBadge charge={c} /></TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {canWrite && c.status !== 'pago' && (
                    <MarkAsPaidDialog charge={c} trigger={<Button size="icon" variant="ghost" title="Registrar pagamento"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></Button>} />
                  )}
                  {canWrite && c.status !== 'cancelado' && (
                    <Button size="icon" variant="ghost" title="Emitir boleto" onClick={() => emitir(c.id)}><FileText className="h-4 w-4 text-sky-600" /></Button>
                  )}
                  {canWrite && (
                    <ChargeFormDialog row={c} trigger={<Button size="icon" variant="ghost" title="Editar"><Pencil className="h-4 w-4" /></Button>} />
                  )}
                  {canWrite && (
                    <ConfirmDeleteDialog onConfirm={() => onDelete(c.id)} description="A cobrança e seus boletos serão removidos." trigger={<Button size="icon" variant="ghost" title="Excluir"><Trash2 className="h-4 w-4 text-rose-600" /></Button>} />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
