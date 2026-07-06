import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Download, Plus, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAccountingExports, useAccountingExportActions, type AccountingExport } from '@/hooks/useAccountingExports';

export default function ExportacoesContabeis() {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState<{ periodo_inicio: string; periodo_fim: string; tipo: AccountingExport['tipo']; formato: 'csv' | 'txt' }>({
    periodo_inicio: monthAgo, periodo_fim: today, tipo: 'consolidado', formato: 'csv',
  });

  const { data: list = [], isLoading } = useAccountingExports();
  const { generate, download } = useAccountingExportActions();

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Exportações Contábeis</h1>
            <p className="text-muted-foreground text-sm">Arquivos consolidados para ERP contábil (CSV/TXT)</p>
          </div>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Gerar exportação</Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">Histórico</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? <div className="p-6"><TableSkeleton rows={6} /></div>
              : list.length === 0 ? <EmptyState icon={FileText} title="Nenhuma exportação" description="Gere o primeiro arquivo." />
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Período</TableHead><TableHead>Tipo</TableHead><TableHead>Formato</TableHead>
                    <TableHead>Linhas</TableHead><TableHead>Status</TableHead><TableHead>Gerado em</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {list.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.periodo_inicio} → {e.periodo_fim}</TableCell>
                        <TableCell><Badge variant="outline">{e.tipo}</Badge></TableCell>
                        <TableCell>{e.formato.toUpperCase()}</TableCell>
                        <TableCell>{e.total_linhas}</TableCell>
                        <TableCell>
                          {e.status === 'gerando' && <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Gerando</Badge>}
                          {e.status === 'concluido' && <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</Badge>}
                          {e.status === 'erro' && <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Erro</Badge>}
                        </TableCell>
                        <TableCell className="text-xs">{e.concluido_em ? new Date(e.concluido_em).toLocaleString('pt-BR') : '—'}</TableCell>
                        <TableCell>
                          {e.status === 'concluido' && (
                            <Button size="sm" variant="outline" onClick={() => download(e)}><Download className="h-3.5 w-3.5 mr-1" /> Baixar</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova exportação contábil</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Início</Label><Input type="date" value={form.periodo_inicio} onChange={(e) => setForm({ ...form, periodo_inicio: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="date" value={form.periodo_fim} onChange={(e) => setForm({ ...form, periodo_fim: e.target.value })} /></div>
            </div>
            <div><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consolidado">Consolidado</SelectItem>
                  <SelectItem value="movimentacoes">Movimentações de estoque</SelectItem>
                  <SelectItem value="contas_pagas">Contas pagas</SelectItem>
                  <SelectItem value="ajustes">Ajustes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Formato</Label>
              <Select value={form.formato} onValueChange={(v) => setForm({ ...form, formato: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="csv">CSV</SelectItem><SelectItem value="txt">TXT</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => generate.mutate(form, { onSuccess: () => setOpen(false) })} disabled={generate.isPending}>Gerar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
