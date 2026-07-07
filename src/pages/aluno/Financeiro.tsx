import { MainLayout } from '@/components/layout/MainLayout';
import { useMyCharges, useMySlips, useMyScholarships } from '@/hooks/useFinance';
import { PaymentSlipCard } from '@/components/financeiro/PaymentSlipCard';
import { ChargeStatusBadge } from '@/components/financeiro/ChargeStatusBadge';
import { StudentFinancialTimeline } from '@/components/financeiro/StudentFinancialTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, GraduationCap } from 'lucide-react';
import { formatBRL, formatDate, formatMonthRef, SCHOLARSHIP_TYPE_LABEL } from '@/lib/finance';

export default function AlunoFinanceiro() {
  const { data: charges = [], isLoading } = useMyCharges();
  const { data: slips = [] } = useMySlips();
  const { data: scholarships = [] } = useMyScholarships();

  const openCharges = charges.filter((c: any) => c.status !== 'pago' && c.status !== 'cancelado');
  const openSlips = slips.filter((s: any) => s.status === 'emitido');

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" />Financeiro</h1>
          <p className="text-muted-foreground text-sm">Suas mensalidades, boletos e bolsas.</p>
        </div>

        {scholarships.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><GraduationCap className="h-4 w-4 text-violet-600" />Minhas bolsas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {scholarships.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between border-b border-border last:border-0 pb-2">
                  <div>
                    <p className="font-medium">{s.scholarship?.name}</p>
                    <p className="text-xs text-muted-foreground">{SCHOLARSHIP_TYPE_LABEL[s.scholarship?.type]} · {s.scholarship?.discount_kind === 'percent' ? `${s.scholarship?.discount_value}%` : formatBRL(s.scholarship?.discount_value)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(s.starts_at)} → {s.ends_at ? formatDate(s.ends_at) : 'em vigor'}</p>
                  </div>
                  <Badge variant={s.status === 'ativa' ? 'default' : 'secondary'}>{s.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Mensalidades em aberto</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-24" /> : openCharges.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma mensalidade em aberto.</p> : (
              <div className="space-y-2">
                {openCharges.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between border-b border-border last:border-0 pb-2">
                    <div>
                      <p className="font-medium capitalize">{formatMonthRef(c.reference_month)}</p>
                      <p className="text-xs text-muted-foreground">Vencimento: {formatDate(c.due_date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums font-semibold">{formatBRL(c.net_amount)}</span>
                      <ChargeStatusBadge charge={c} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {openSlips.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Boletos disponíveis</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {openSlips.map((s: any) => <PaymentSlipCard key={s.id} slip={s} />)}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
          <CardContent><StudentFinancialTimeline charges={charges} /></CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
