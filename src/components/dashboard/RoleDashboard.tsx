import { RoleHomeCover, RoleHomeCta, RoleHomeKpi } from './RoleHomeCover';
import { QuickAction } from './QuickAction';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface RoleQuickAction {
  title: string;
  description?: string;
  icon: LucideIcon;
  to: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'sky' | 'indigo' | 'teal';
}

interface RoleDashboardProps {
  chipLabel: string;
  chipIcon?: LucideIcon;
  description: string;
  ctas?: RoleHomeCta[];
  kpis: RoleHomeKpi[];
  quickActions: RoleQuickAction[];
  quickActionsTitle?: string;
}

export function RoleDashboard({
  chipLabel, chipIcon, description, ctas, kpis, quickActions,
  quickActionsTitle = 'Acessos rápidos',
}: RoleDashboardProps) {
  return (
    <div className="space-y-6">
      <RoleHomeCover chipLabel={chipLabel} chipIcon={chipIcon} description={description} ctas={ctas} kpis={kpis} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{quickActionsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {quickActions.map((a) => (
              <QuickAction key={a.to + a.title} {...a} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
