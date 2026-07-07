import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, FileText } from 'lucide-react';
import { SlipStatusBadge } from './ChargeStatusBadge';
import { formatBRL, formatDate } from '@/lib/finance';
import { toast } from '@/hooks/use-toast';

export function PaymentSlipCard({ slip, showStudent = false }: { slip: any; showStudent?: boolean }) {
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copiada` });
    } catch { toast({ title: 'Não foi possível copiar', variant: 'destructive' }); }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold truncate">{slip.slip_number}</span>
          </div>
          {showStudent && slip.student && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{slip.student.full_name}</p>
          )}
        </div>
        <SlipStatusBadge status={slip.status} />
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="font-semibold">{formatBRL(slip.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vencimento</p>
            <p className="font-medium">{formatDate(slip.due_date)}</p>
          </div>
        </div>
        {slip.digitable_line && (
          <div className="rounded-md bg-muted/60 p-2 space-y-1">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold">Linha digitável</p>
            <div className="flex items-center gap-2">
              <code className="text-xs break-all flex-1">{slip.digitable_line}</code>
              <Button size="icon" variant="ghost" onClick={() => copy(slip.digitable_line, 'Linha digitável')}><Copy className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
