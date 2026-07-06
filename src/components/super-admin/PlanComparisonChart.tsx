import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PlanData {
  plan: string;
  totalOrgs: number;
  totalUsers: number;
  totalMovements: number;
  growth: number;
}

interface PlanComparisonChartProps {
  chartData: any[];
  planMetrics: PlanData[];
}

const PLAN_COLORS = {
  basic: 'hsl(var(--chart-1))',
  pro: 'hsl(var(--chart-2))',
  enterprise: 'hsl(var(--chart-3))',
};

const PLAN_LABELS = {
  basic: 'Basic',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export function PlanComparisonChart({ chartData, planMetrics }: PlanComparisonChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparação de Crescimento por Plano</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Gráfico de Linhas */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="basic" 
                stroke={PLAN_COLORS.basic}
                strokeWidth={2}
                name="Basic"
                dot={{ fill: PLAN_COLORS.basic }}
              />
              <Line 
                type="monotone" 
                dataKey="pro" 
                stroke={PLAN_COLORS.pro}
                strokeWidth={2}
                name="Pro"
                dot={{ fill: PLAN_COLORS.pro }}
              />
              <Line 
                type="monotone" 
                dataKey="enterprise" 
                stroke={PLAN_COLORS.enterprise}
                strokeWidth={2}
                name="Enterprise"
                dot={{ fill: PLAN_COLORS.enterprise }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela de Métricas */}
        <div>
          <h3 className="text-sm font-medium mb-3">Métricas Comparativas</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Organizações</TableHead>
                <TableHead className="text-right">Usuários</TableHead>
                <TableHead className="text-right">Movimentações</TableHead>
                <TableHead className="text-right">Crescimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planMetrics.map((plan) => (
                <TableRow key={plan.plan}>
                  <TableCell>
                    <Badge variant="outline">{PLAN_LABELS[plan.plan as keyof typeof PLAN_LABELS]}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{plan.totalOrgs}</TableCell>
                  <TableCell className="text-right font-medium">{plan.totalUsers}</TableCell>
                  <TableCell className="text-right font-medium">
                    {plan.totalMovements.toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {plan.growth > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={plan.growth > 0 ? 'text-green-500' : 'text-red-500'}>
                        {plan.growth > 0 ? '+' : ''}{plan.growth.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
