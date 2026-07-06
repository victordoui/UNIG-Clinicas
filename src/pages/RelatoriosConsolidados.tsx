import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Users,
  Package,
  Activity,
  TrendingUp,
  Download,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

interface OrgStats {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  is_active: boolean;
  max_users: number;
  max_products: number;
  user_count: number;
  product_count: number;
  movement_count: number;
  alert_count: number;
}

export default function RelatoriosConsolidados() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<OrgStats[]>([]);
  const [summary, setSummary] = useState({
    totalOrgs: 0,
    activeOrgs: 0,
    totalUsers: 0,
    totalProducts: 0,
    totalMovements: 0,
    totalAlerts: 0,
  });

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [isSuperAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadConsolidatedData();
    }
  }, [isSuperAdmin]);

  const loadConsolidatedData = async () => {
    setLoading(true);
    try {
      // Load organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (orgsError) throw orgsError;

      // Load counts for each organization
      const statsPromises = (orgsData || []).map(async (org) => {
        const [usersRes, productsRes, movementsRes, alertsRes] = await Promise.all([
          supabase
            .from('organization_members')
            .select('id', { count: 'exact' })
            .eq('organization_id', org.id)
            .eq('is_active', true),
          supabase
            .from('products')
            .select('id', { count: 'exact' })
            .eq('organization_id', org.id),
          supabase
            .from('movements')
            .select('id', { count: 'exact' })
            .eq('organization_id', org.id),
          supabase
            .from('alerts')
            .select('id', { count: 'exact' })
            .eq('organization_id', org.id)
            .eq('is_read', false),
        ]);

        return {
          ...org,
          user_count: usersRes.count || 0,
          product_count: productsRes.count || 0,
          movement_count: movementsRes.count || 0,
          alert_count: alertsRes.count || 0,
        };
      });

      const stats = await Promise.all(statsPromises);
      setOrganizations(stats);

      // Calculate summary
      const totalUsers = stats.reduce((sum, org) => sum + org.user_count, 0);
      const totalProducts = stats.reduce((sum, org) => sum + org.product_count, 0);
      const totalMovements = stats.reduce((sum, org) => sum + org.movement_count, 0);
      const totalAlerts = stats.reduce((sum, org) => sum + org.alert_count, 0);

      setSummary({
        totalOrgs: stats.length,
        activeOrgs: stats.filter((o) => o.is_active).length,
        totalUsers,
        totalProducts,
        totalMovements,
        totalAlerts,
      });
    } catch (error) {
      console.error('Error loading consolidated data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUtilizationPercentage = (current: number, max: number) => {
    return Math.min(Math.round((current / max) * 100), 100);
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 70) return 'text-warning';
    return 'text-success';
  };

  if (!isSuperAdmin) return null;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Relatórios Consolidados
            </h1>
            <p className="text-muted-foreground mt-1">
              Visão comparativa de todas as organizações
            </p>
          </div>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Organizações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">{summary.totalOrgs}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {summary.activeOrgs} ativas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">{summary.totalUsers}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Em todas as organizações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">{summary.totalProducts}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Cadastrados no sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Movimentações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">{summary.totalMovements}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Total geral</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Alertas Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">{summary.totalAlerts}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Não lidos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Média por Org
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-semibold">
                    {summary.totalOrgs > 0
                      ? Math.round(summary.totalUsers / summary.totalOrgs)
                      : 0}
                  </span>{' '}
                  usuários
                </p>
                <p className="text-sm text-muted-foreground">
                  {summary.totalOrgs > 0
                    ? Math.round(summary.totalProducts / summary.totalOrgs)
                    : 0}{' '}
                  produtos
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organizations Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ranking de Organizações
            </CardTitle>
            <CardDescription>
              Comparativo de utilização e atividade por organização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organização</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usuários</TableHead>
                    <TableHead>Produtos</TableHead>
                    <TableHead>Movimentações</TableHead>
                    <TableHead>Alertas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations
                    .sort((a, b) => b.movement_count - a.movement_count)
                    .map((org) => {
                      const userUtilization = getUtilizationPercentage(
                        org.user_count,
                        org.max_users
                      );
                      const productUtilization = getUtilizationPercentage(
                        org.product_count,
                        org.max_products
                      );

                      return (
                        <TableRow key={org.id}>
                          <TableCell className="font-medium">{org.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{org.subscription_plan}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={org.is_active ? 'default' : 'secondary'}>
                              {org.is_active ? 'Ativa' : 'Inativa'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  {org.user_count} / {org.max_users}
                                </span>
                                <span
                                  className={`text-xs ${getUtilizationColor(
                                    userUtilization
                                  )}`}
                                >
                                  ({userUtilization}%)
                                </span>
                              </div>
                              <Progress value={userUtilization} className="h-1" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  {org.product_count} / {org.max_products}
                                </span>
                                <span
                                  className={`text-xs ${getUtilizationColor(
                                    productUtilization
                                  )}`}
                                >
                                  ({productUtilization}%)
                                </span>
                              </div>
                              <Progress value={productUtilization} className="h-1" />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {org.movement_count}
                          </TableCell>
                          <TableCell className="text-center">
                            {org.alert_count > 0 ? (
                              <Badge variant="destructive">{org.alert_count}</Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>

              {organizations.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma organização encontrada</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
