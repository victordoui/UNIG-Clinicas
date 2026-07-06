import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Wallet, AlertTriangle, Clock, CheckCircle2, DollarSign, CreditCard } from 'lucide-react';
import { useAccountsPayable, useAccountsPayableSummary, type AccountPayable } from '@/hooks/useAccountsPayable';
import { RegisterPaymentModal } from '@/components/financial/RegisterPaymentModal';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { useAuth } from '@/hooks/useAuth';

const statusConfig: Record<string, { label: string; variant: any }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  parcial: { label: 'Parcial', variant: 'default' },
  pago: { label: 'Pago', variant: 'default' },
  vencido: { label: 'Vencido', variant: 'destructive' },
  cancelado: { label: 'Cancelado', variant: 'outline' },
};

const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('pt-BR');

export default function ContasAPagar() {
  const { currentRole } = useAuth();
  const canPay = currentRole === 'admin' || currentRole === 'gerente';
  const [statusFilter, setStatusFilter] = useState('all');
  const [vencDe, setVencDe] = useState('');
  const [vencAte, setVencAte] = useState('');
  const { data: list = [], isLoading } = useAccountsPayable({
    status: statusFilter,
    vencimento_de: vencDe || undefined,
    vencimento_ate: vencAte || undefined,
  });
  const { data: summary } = useAccountsPayableSummary();
  const [selected, setSelected] = useState<AccountPayable | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const openPay = (p: AccountPayable) => { setSelected(p); setPayOpen(true); };

  const isVencido = (p: AccountPayable) =>
    (p.status === 'pendente' || p.status === 'parcial') &&
    new Date(p.data_vencimento) < new Date(new Date().toISOString().slice(0, 10));

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> Contas a Pagar
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie compromissos financeiros gerados pelas compras.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg"><DollarSign className="h-5 w-5 text-primary" /></div>
              <div><p className="text-sm text-muted-foreground">Total a pagar</p><p className="text-xl font-bold">{fmt(summary?.total_pendente || 0)}</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
              <div><p className="text-sm text-muted-foreground">Vencidas</p><p className="text-xl font-bold">{fmt(summary?.total_vencido || 0)}</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg"><Clock className="h-5 w-5 text-warning" /></div>
              <div><p className="text-sm text-muted-foreground">A vencer 7 dias</p><p className="text-xl font-bold">{fmt(summary?.vence_7_dias || 0)}</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg"><CheckCircle2 className="h-5 w-5 text-success" /></div>
              <div><p className="text-sm text-muted-foreground">Pago no mês</p><p className="text-xl font-bold">{fmt(summary?.pago_mes || 0)}</p></div>
            </div>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Compromissos</CardTitle>
            <div className="flex flex-wrap gap-2 pt-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={vencDe} onChange={e => setVencDe(e.target.value)} className="w-40" placeholder="De" />
              <Input type="date" value={vencAte} onChange={e => setVencAte(e.target.value)} className="w-40" placeholder="Até" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Documento</TableHead><TableHead>Fornecedor</TableHead>
                  <TableHead>Vencimento</TableHead><TableHead>Valor</TableHead>
                  <TableHead>Saldo</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody><TableSkeleton rows={6} columns={7} /></TableBody>
              </Table>
            ) : list.length === 0 ? (
              <EmptyState icon={Wallet} title="Sem contas a pagar" description="Recebimentos confirmados sem divergência geram contas automaticamente." />
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Documento</TableHead><TableHead>Fornecedor</TableHead>
                  <TableHead>Vencimento</TableHead><TableHead>Valor</TableHead>
                  <TableHead>Saldo</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {list.map((p: any, i) => {
                    const venc = isVencido(p);
                    const effStatus = venc && p.status !== 'pago' ? 'vencido' : p.status;
                    const cfg = statusConfig[effStatus] || statusConfig.pendente;
                    const saldo = Number(p.valor_total) - Number(p.valor_pago);
                    return (
                      <TableRow key={p.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                        <TableCell>
                          <div className="font-medium">{p.descricao || '-'}</div>
                          <div className="text-xs text-muted-foreground">{p.purchase_orders?.numero || p.numero_documento || ''}</div>
                        </TableCell>
                        <TableCell>{p.suppliers?.nome_fantasia || '-'}</TableCell>
                        <TableCell className={venc ? 'text-destructive font-medium' : ''}>{fmtDate(p.data_vencimento)}</TableCell>
                        <TableCell>{fmt(p.valor_total)}</TableCell>
                        <TableCell className="font-medium">{fmt(saldo)}</TableCell>
                        <TableCell><Badge variant={cfg.variant}>{cfg.label}</Badge></TableCell>
                        <TableCell className="text-right">
                          {canPay && p.status !== 'pago' && p.status !== 'cancelado' && (
                            <Button size="sm" variant="outline" onClick={() => openPay(p)}>
                              <CreditCard className="h-4 w-4 mr-2" />Pagar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <RegisterPaymentModal payable={selected} open={payOpen} onOpenChange={setPayOpen} />
    </MainLayout>
  );
}
