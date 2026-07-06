import { useMemo, useRef, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { FileInput, FileText, Upload, AlertTriangle, CheckCircle2, PackageCheck, DollarSign, Search, Loader2, Link2, Trash2 } from 'lucide-react';
import {
  useInboundInvoices, useInboundDashboard, useInboundInvoiceItems,
  useImportNfeXml, useLinkInvoiceToOrder, useConfirmReceipt, useDeleteInboundInvoice,
  type InboundInvoice, type InboundStatus,
} from '@/hooks/useInboundInvoices';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { formatBRL } from '@/lib/purchaseLabels';

type Row = InboundInvoice & { suppliers?: { nome_fantasia: string }; purchase_orders?: { numero: string } };

const STATUS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos os status' },
  { value: 'importado', label: 'Importado' },
  { value: 'conciliado', label: 'Conciliado' },
  { value: 'divergente', label: 'Divergente' },
  { value: 'recebido', label: 'Recebido' },
  { value: 'cancelado', label: 'Cancelado' },
];

function statusBadge(s: InboundStatus) {
  const map: Record<InboundStatus, string> = {
    importado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    conciliado: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    divergente: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    recebido: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    cancelado: 'bg-muted text-muted-foreground',
  };
  return map[s] ?? 'bg-muted text-muted-foreground';
}

export default function RecebimentoFiscal() {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: dashboard } = useInboundDashboard();
  const { data: list = [], isLoading } = useInboundInvoices({ status, search });
  const { data: items = [] } = useInboundInvoiceItems(selected?.id);
  const { data: orders = [] } = usePurchaseOrders();

  const importMut = useImportNfeXml();
  const linkMut = useLinkInvoiceToOrder();
  const confirmMut = useConfirmReceipt();
  const deleteMut = useDeleteInboundInvoice();

  const supplierOrders = useMemo(() => {
    if (!selected?.supplier_id) return [] as any[];
    return (orders ?? []).filter((o: any) => o.supplier_id === selected.supplier_id && o.status !== 'cancelado');
  }, [orders, selected]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      try {
        await importMut.mutateAsync(file);
      } catch { /* toast já cobre */ }
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileInput className="h-6 w-6 text-primary" /> Recebimento Fiscal
            </h1>
            <p className="text-sm text-muted-foreground">Importe XMLs de NF-e, concilie com pedidos e dê entrada no estoque.</p>
          </div>
          <div>
            <input ref={fileRef} type="file" accept=".xml,application/xml,text/xml" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <Button onClick={() => fileRef.current?.click()} disabled={importMut.isPending}>
              {importMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Importar XML
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Kpi icon={<FileText className="h-4 w-4" />} label="Importadas hoje" value={dashboard?.importadas_hoje ?? 0} />
          <Kpi icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} label="Aguardando" value={dashboard?.aguardando ?? 0} />
          <Kpi icon={<AlertTriangle className="h-4 w-4 text-red-500" />} label="Divergentes" value={dashboard?.divergentes ?? 0} />
          <Kpi icon={<PackageCheck className="h-4 w-4 text-emerald-500" />} label="Recebidas no mês" value={dashboard?.recebidas_mes ?? 0} />
          <Kpi icon={<DollarSign className="h-4 w-4 text-primary" />} label="Valor do mês" value={formatBRL(Number(dashboard?.valor_mes ?? 0))} />
        </div>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Notas fiscais de entrada</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar nº, chave, fornecedor" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-64" />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={6} columns={6} />
            ) : list.length === 0 ? (
              <EmptyState icon={FileInput} title="Nenhuma NF-e importada" description="Importe arquivos XML de NF-e para começar." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número/Série</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((r: Row) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}>
                      <TableCell className="font-medium">{r.numero ?? '—'}{r.serie ? ` / ${r.serie}` : ''}</TableCell>
                      <TableCell>{r.suppliers?.nome_fantasia ?? r.supplier_nome ?? '—'}</TableCell>
                      <TableCell>{r.emissao ?? '—'}</TableCell>
                      <TableCell>{formatBRL(Number(r.valor_total))}</TableCell>
                      <TableCell>{r.purchase_orders?.numero ?? '—'}</TableCell>
                      <TableCell><Badge className={statusBadge(r.status)}>{r.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>NF-e {selected.numero ?? selected.chave_acesso}</SheetTitle>
                <SheetDescription>{selected.supplier_nome ?? '—'} • {formatBRL(Number(selected.valor_total))}</SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Chave" value={selected.chave_acesso} mono />
                  <Info label="Emissão" value={selected.emissao ?? '—'} />
                  <Info label="Vencimento" value={selected.data_vencimento ?? '—'} />
                  <Info label="Status" value={<Badge className={statusBadge(selected.status)}>{selected.status}</Badge>} />
                </div>

                {Array.isArray(selected.parse_warnings) && selected.parse_warnings.length > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs space-y-1">
                    <div className="font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Avisos</div>
                    {selected.parse_warnings.map((w: string, i: number) => <div key={i}>• {w}</div>)}
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium mb-2 flex items-center gap-1"><Link2 className="h-4 w-4" /> Vincular a pedido</div>
                  <Select
                    value={selected.order_id ?? 'none'}
                    onValueChange={(v) => linkMut.mutate({ invoice_id: selected.id, order_id: v === 'none' ? null : v })}
                    disabled={selected.status === 'recebido'}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecionar pedido aberto" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem vínculo</SelectItem>
                      {supplierOrders.map((o: any) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.numero} • {formatBRL(Number(o.valor_total ?? 0))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {supplierOrders.length === 0 && selected.supplier_id && (
                    <p className="text-xs text-muted-foreground mt-1">Nenhum pedido aberto para este fornecedor.</p>
                  )}
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Itens ({items.length})</div>
                  <div className="rounded-md border max-h-72 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Unit.</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Match</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((it) => (
                          <TableRow key={it.id}>
                            <TableCell className="text-xs">{it.descricao}<div className="text-muted-foreground">{it.cean ?? ''}</div></TableCell>
                            <TableCell className="text-right text-xs">{Number(it.quantidade).toFixed(2)}</TableCell>
                            <TableCell className="text-right text-xs">{formatBRL(Number(it.valor_unitario))}</TableCell>
                            <TableCell className="text-right text-xs">{formatBRL(Number(it.valor_total))}</TableCell>
                            <TableCell>
                              {it.product_id ? (
                                <Badge variant="outline" className="text-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-700">Sem produto</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => confirmMut.mutate(selected.id, { onSuccess: () => setSelected(null) })}
                    disabled={selected.status === 'recebido' || confirmMut.isPending}
                    className="flex-1"
                  >
                    {confirmMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PackageCheck className="h-4 w-4 mr-2" />}
                    Confirmar recebimento
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm('Remover esta NF-e?')) deleteMut.mutate(selected.id, { onSuccess: () => setSelected(null) });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm ${mono ? 'font-mono break-all' : ''}`}>{value}</div>
    </div>
  );
}
