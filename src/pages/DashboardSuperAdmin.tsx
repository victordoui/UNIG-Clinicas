import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Building2, Users, Package, ShieldCheck } from "lucide-react";
import { Area, AreaChart, Pie, PieChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DashboardFilters } from "@/components/super-admin/DashboardFilters";
import { PlanComparisonChart } from "@/components/super-admin/PlanComparisonChart";

interface DashboardStats {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  totalProducts: number;
  totalMovements: number;
  growthRate: number;
}

interface TopOrganization {
  name: string;
  plan: string;
  movements: number;
  products: number;
  users: number;
}

interface OrganizationLimit {
  name: string;
  userUsage: number;
  productUsage: number;
  maxUsers: number;
  maxProducts: number;
  currentUsers: number;
  currentProducts: number;
}

const PLAN_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export default function DashboardSuperAdmin() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrgs: 0,
    activeOrgs: 0,
    totalUsers: 0,
    totalProducts: 0,
    totalMovements: 0,
    growthRate: 0,
  });
  const [topOrgs, setTopOrgs] = useState<TopOrganization[]>([]);
  const [orgsNearLimit, setOrgsNearLimit] = useState<OrganizationLimit[]>([]);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [planDistribution, setPlanDistribution] = useState<any[]>([]);
  
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '3m' | '6m' | '1y' | 'custom'>('30d');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [selectedPlans, setSelectedPlans] = useState<string[]>(['basic', 'pro', 'enterprise']);
  const [planComparisonData, setPlanComparisonData] = useState<any[]>([]);
  const [planMetrics, setPlanMetrics] = useState<any[]>([]);

  useEffect(() => {
    if (profile && !profile.is_super_admin) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange, customStartDate, customEndDate, selectedPlans]);

  const getDateRangeFilter = () => {
    if (dateRange === 'custom') {
      return { start: customStartDate, end: customEndDate };
    }
    const now = new Date();
    const ranges = { '7d': 7, '30d': 30, '3m': 90, '6m': 180, '1y': 365 };
    const start = new Date(now.getTime() - ranges[dateRange] * 24 * 60 * 60 * 1000);
    return { start, end: now };
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRangeFilter();
      
      const [{ data: orgs }, { data: users }, { data: products }, { data: movements }] = await Promise.all([
        supabase.from('organizations').select('*'),
        supabase.from('organization_members').select('*').eq('is_active', true),
        supabase.from('products').select('*'),
        start && end 
          ? supabase.from('movements').select('*').gte('created_at', start.toISOString()).lte('created_at', end.toISOString())
          : supabase.from('movements').select('*').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const activeOrgs = orgs?.filter(o => o.is_active).length || 0;
      
      setStats({
        totalOrgs: orgs?.length || 0,
        activeOrgs,
        totalUsers: users?.length || 0,
        totalProducts: products?.length || 0,
        totalMovements: movements?.length || 0,
        growthRate: 12,
      });

      const planCounts = orgs?.reduce((acc: any, org) => {
        const plan = org.subscription_plan || 'basic';
        acc[plan] = (acc[plan] || 0) + 1;
        return acc;
      }, {});

      const planData = Object.entries(planCounts || {}).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));
      setPlanDistribution(planData);

      const monthlyGrowth = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const monthOrgs = orgs?.filter(o => {
          const createdAt = new Date(o.created_at);
          return createdAt >= monthStart && createdAt <= monthEnd;
        }).length || 0;
        return { month: format(monthStart, 'MMM/yy', { locale: ptBR }), count: monthOrgs };
      });

      setGrowthData(monthlyGrowth);

      if (orgs) await loadPlanComparisonData(start!, end!, orgs);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadPlanComparisonData = async (startDate: Date, endDate: Date, orgsData: any[]) => {
    const monthlyData: any = {};
    const metrics: any = {};

    for (const plan of selectedPlans) {
      const planOrgs = orgsData.filter(org => org.subscription_plan === plan);
      planOrgs.forEach(org => {
        const month = format(new Date(org.created_at), 'MMM/yy', { locale: ptBR });
        if (!monthlyData[month]) monthlyData[month] = { month };
        monthlyData[month][plan] = (monthlyData[month][plan] || 0) + 1;
      });

      metrics[plan] = {
        plan,
        totalOrgs: planOrgs.length,
        totalUsers: 0,
        totalMovements: 0,
        growth: 0,
      };
    }

    setPlanComparisonData(Object.values(monthlyData));
    setPlanMetrics(Object.values(metrics));
  };

  if (loading) {
    return <MainLayout><div className="flex items-center justify-center min-h-screen"><div className="text-muted-foreground">Carregando...</div></div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /> Dashboard Super Admin</h1>
          <p className="text-muted-foreground">Visão geral do sistema</p>
        </div>

        <DashboardFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomDateChange={(start, end) => { setCustomStartDate(start); setCustomEndDate(end); }}
          selectedPlans={selectedPlans}
          onPlansChange={setSelectedPlans}
          onApply={loadDashboardData}
          onClear={() => { setDateRange('30d'); setCustomStartDate(null); setCustomEndDate(null); setSelectedPlans(['basic', 'pro', 'enterprise']); }}
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Organizações</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrgs}</div>
              <p className="text-xs text-muted-foreground">{stats.activeOrgs} ativas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Movimentações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMovements}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Crescimento de Organizações</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Plano</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={planDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                    {planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PLAN_COLORS[index % PLAN_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {planComparisonData.length > 0 && <PlanComparisonChart chartData={planComparisonData} planMetrics={planMetrics} />}
      </div>
    </MainLayout>
  );
}
