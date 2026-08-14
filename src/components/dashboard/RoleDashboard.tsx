import { RoleHomeCover, RoleHomeCta, RoleHomeKpi } from './RoleHomeCover';
import { QuickAction } from './QuickAction';
import { Bell, CheckCircle2, Clock3, LucideIcon, Megaphone } from 'lucide-react';
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
    <div className="space-y-4">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3"><CardTitle className="text-base">Atividades recentes</CardTitle><span className="text-xs font-semibold text-primary">Ver todas</span></CardHeader>
          <CardContent className="space-y-3">
            {[['Novo acesso registrado', 'Atualização realizada há poucos minutos', CheckCircle2], ['Processamento acadêmico', 'Dados sincronizados com sucesso', Clock3], ['Ação disponível', 'Consulte os módulos do portal', Bell]].map(([title, text, Icon]: any) => <div key={title} className="flex items-center gap-3"><div className="rounded-lg bg-blue-50 p-2 text-primary"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="text-xs text-muted-foreground">{text}</p></div><span className="text-[10px] text-muted-foreground">Agora</span></div>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3"><CardTitle className="text-base">Avisos e comunicados</CardTitle><span className="text-xs font-semibold text-primary">Ver todos</span></CardHeader>
          <CardContent className="space-y-3">
            {[['Calendário acadêmico', 'Consulte os prazos e eventos do período.', 'Informativo'], ['Ambiente acadêmico', 'Módulos disponíveis para sua função.', 'Sistema'], ['Central de comunicação', 'Acompanhe os comunicados institucionais.', 'Novidade']].map(([title, text, tag]) => <div key={title} className="flex items-center gap-3"><div className="rounded-lg bg-violet-50 p-2 text-violet-600"><Megaphone className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="text-xs text-muted-foreground">{text}</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-primary">{tag}</span></div>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
