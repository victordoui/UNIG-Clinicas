import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CHARGE_STATUS_LABEL, SLIP_STATUS_LABEL, chargeStatusBadgeClass, slipStatusBadgeClass, effectiveChargeStatus } from '@/lib/finance';

export function ChargeStatusBadge({ charge }: { charge: { status?: string; due_date?: string } }) {
  const s = effectiveChargeStatus(charge);
  return <Badge variant="outline" className={cn('font-medium', chargeStatusBadgeClass(s))}>{CHARGE_STATUS_LABEL[s] ?? s}</Badge>;
}

export function SlipStatusBadge({ status }: { status?: string }) {
  return <Badge variant="outline" className={cn('font-medium', slipStatusBadgeClass(status))}>{SLIP_STATUS_LABEL[status ?? ''] ?? status}</Badge>;
}
