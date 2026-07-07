import { CoverKpiCard } from '@/components/dashboard/CoverKpiCard';
import { DollarSign, AlertTriangle, TrendingUp, GraduationCap } from 'lucide-react';
import { formatBRL } from '@/lib/finance';

export function FinanceKpiRow({ summary }: { summary: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <CoverKpiCard label="Recebido no mês" value={formatBRL(summary?.paidThisMonth)} icon={DollarSign} tone="emerald" />
      <CoverKpiCard label="A receber" value={formatBRL(summary?.toReceive)} icon={TrendingUp} tone="blue" />
      <CoverKpiCard label="Inadimplência" value={`${(summary?.defaultRate ?? 0).toFixed(1)}%`} icon={AlertTriangle} tone="orange" />
      <CoverKpiCard label="Bolsas ativas" value={summary?.activeScholarships ?? 0} icon={GraduationCap} tone="violet" />
    </div>
  );
}
