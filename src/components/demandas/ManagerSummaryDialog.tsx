import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Sparkles, Check, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { exportManagerSummaryPDF, exportManagerSummaryExcel } from '@/lib/demandsExport';
import type { OperationalDemand } from '@/hooks/useOperationalDemands';

interface Props {
  title?: string;
  description?: string;
  buildSummary: () => string;
  rows?: OperationalDemand[];
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
  triggerSize?: 'default' | 'sm' | 'lg' | 'icon';
  triggerClassName?: string;
}

export function ManagerSummaryDialog({
  title = 'Resumo para diretoria',
  description = 'Texto pronto para copiar e compartilhar com a diretoria.',
  buildSummary,
  rows,
  triggerLabel = 'Gerar resumo para diretoria',
  triggerVariant = 'outline',
  triggerSize = 'sm',
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (o) { setText(buildSummary()); setCopied(false); }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: 'Resumo copiado', description: 'Cole onde precisar.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  }

  function downloadPDF() {
    if (!rows) return;
    exportManagerSummaryPDF(rows, text);
    toast({ title: 'PDF gerado' });
  }
  function downloadXLSX() {
    if (!rows) return;
    exportManagerSummaryExcel(rows, text);
    toast({ title: 'Excel gerado' });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className={triggerClassName}>
          <Sparkles className="h-4 w-4 mr-1" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DialogHeader>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} className="text-sm leading-relaxed" />
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
          {rows && rows.length > 0 && (
            <>
              <Button variant="outline" onClick={downloadXLSX}>
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
              </Button>
              <Button variant="outline" onClick={downloadPDF}>
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
            </>
          )}
          <Button onClick={copy}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? 'Copiado' : 'Copiar resumo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
