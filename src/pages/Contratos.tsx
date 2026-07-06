import { useMemo, useState } from 'react';
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
import {
  FileSignature, AlertTriangle, CheckCircle2, RefreshCw, XCircle, DollarSign, Calendar, Search,
} from 'lucide-react';
import {
  useContractsList, useContractsDashboard, useRenewContract, useEndContract, useContractOrders,
  contractStatusBadgeClass, contractStatusLabel, daysUntil, type ContractRow,
} from '@/hooks/useContracts';
import { formatBRL } from '@/lib/purchaseLabels';

type ContractRowFull = ContractRow & { suppliers?: { nome_fantasia: string } };

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'em_renovacao', label: 'Em renovação' },
  { value: 'suspenso', label: 'Suspenso' },
  { value: 'encerrado', label: 'Encerrado' },
];

export default function Contratos() {
  const [status, setStatus] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ContractRowFull | null>(null);

  const { data: dashboard } = useContractsDashboard();
  const { data: rawList = [], isLoading } = useContractsList(
    status === 'all' ? {} : { status },
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rawList;
    return rawList.filter((c) =>
      c.numero.toLowerCase().includes(q) ||
      (c.suppliers?.nome_fantasia ?? '').toLowerCase().includes(q) ||
      (c.categoria ?? '').toLowerCase().includes(q),
    );
  }, [rawList, query]);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSignature className="h-6 w-6 text-primary" /> Contratos
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie contratos ativos, vencimentos e renovações.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard icon={CheckCircle2} label="Ativos" value={dashboard?.ativos ?? 0} tone="success" />
          <KpiCard icon={AlertTriangle} label="Vencendo 30d" value={dashboard?.vencendo_30d ?? 0} tone="warn" />
          <KpiCard icon={XCircle} label="Vencidos" value={dashboard?.vencidos ?? 0} tone="danger" />
          <KpiCard icon={RefreshCw} label="Em renovação" value={dashboard?.em_renovacao ?? 0} tone="info" />
          <KpiCard icon={DollarSign} label="Valor mensal" value={formatBRL(dashboard?.valor_mensal_total ?? 0)} tone="primary" />
        </div>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Lista de contratos</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar..." className="pl-8 w-48" />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4"><TableSkeleton rows={6} columns={6} /></div>
            ) : list.length === 0 ? (
              <EmptyState icon={FileSignature} title="Sem contratos" description="Cadastre contratos a partir da página de Fornecedores." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Vigência</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor mensal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((c) => {
                      const days = daysUntil(c.fim);
                      return (
                        <TableRow key={c.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelected(c)}>
                          <TableCell className="font-mono text-xs">{c.numero}</TableCell>
                          <TableCell className="font-medium">{c.suppliers?.nome_fantasia ?? '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.inicio} → {c.fim}</TableCell>
                          <TableCell className="text-xs">
                            {days < 0 ? (
                              <span className="text-destructive">{Math.abs(days)} d atrasado</span>
                            ) : days <= 30 ? (
                              <span className="text-orange-600">em {days} d</span>
                            ) : (
                              <span className="text-muted-foreground">em {days} d</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={contractStatusBadgeClass(c)}>{contractStatusLabel(c)}</Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{c.valor_mensal ? formatBRL(c.valor_mensal) : '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ContractDetailSheet contract={selected} onClose={() => setSelected(null)} />
    </MainLayout>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: any; tone: 'success' | 'warn' | 'danger' | 'info' | 'primary' }) {
  const toneClass = {
    success: 'text-emerald-600',
    warn: 'text-orange-600',
    danger: 'text-destructive',
    info: 'text-amber-600',
    primary: 'text-primary',
  }[tone];
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${toneClass}`} />
        </div>
        <div className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function ContractDetailSheet({ contract, onClose }: { contract: ContractRowFull | null; onClose: () => void }) {
  const renew = useRenewContract();
  const end = useEndContract();
  const { data: orders = [] } = useContractOrders(contract?.id);

  if (!contract) return null;
  const consumed = orders.reduce((a: number, o: any) => a + Number(o.valor_total || 0), 0);

  return (
    <Sheet open={!!contract} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Contrato {contract.numero}
            <Badge variant="outline" className={contractStatusBadgeClass(contract)}>{contractStatusLabel(contract)}</Badge>
          </SheetTitle>
          <SheetDescription>{contract.suppliers?.nome_fantasia ?? ''}</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 mt-6">
          <InfoRow label="Vigência" value={`${contract.inicio} → ${contract.fim}`} />
          <InfoRow label="Categoria" value={contract.categoria ?? '—'} />
          <InfoRow label="Valor mensal" value={contract.valor_mensal ? formatBRL(contract.valor_mensal) : '—'} />
          <InfoRow label="Desconto" value={`${contract.desconto_percent ?? 0}%`} />
          <InfoRow label="Condição pagamento" value={contract.condicao_pagamento ?? '—'} />
          <InfoRow label="Renovação automática" value={contract.auto_renovacao ? 'Sim' : 'Não'} />
          <InfoRow label="Aviso em" value={`${contract.dias_aviso_vencimento} d antes`} />

          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Pedidos vinculados</span>
              <span className="text-xs text-muted-foreground">{orders.length} pedido(s) · {formatBRL(consumed)}</span>
            </div>
            {orders.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum pedido emitido sob este contrato.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {orders.map((o: any) => (
                  <div key={o.id} className="flex justify-between text-xs border rounded p-2">
                    <span className="font-mono">{o.numero}</span>
                    <span>{o.status}</span>
                    <span className="tabular-nums">{formatBRL(o.valor_total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => renew.mutate({ contract }, { onSuccess: onClose })}
              disabled={contract.status === 'encerrado' || renew.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Renovar (+12 meses)
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => end.mutate(contract.id, { onSuccess: onClose })}
              disabled={contract.status === 'encerrado' || end.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" /> Encerrar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm border-b pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
