import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationDetails } from "@/hooks/useOrganizationDetails";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Users, Package, Activity, AlertCircle, Calendar as CalendarIcon, X, Edit, Save, Trash2, UserPlus, MoreVertical, Shield, Ban, CheckCircle, CreditCard, Plus, FileText, TrendingUp, Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActivityTimelineItem } from "@/components/admin/ActivityTimelineItem";
import { AuditLogRow } from "@/components/admin/AuditLogRow";
import { MemberCard } from "@/components/admin/MemberCard";
import { exportMultiSheetExcel } from "@/lib/exportUtils";
import { toast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { InvoiceModal } from "@/components/organizations/InvoiceModal";
import { OrganizationInfoCard } from "@/components/organizations/OrganizationInfoCard";
import { ExecutiveSummaryCard } from "@/components/organizations/ExecutiveSummaryCard";
import { CreatorInfoCard } from "@/components/organizations/CreatorInfoCard";
import { RemoveMemberDialog } from "@/components/organizations/RemoveMemberDialog";

export default function OrganizationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const {
    loading,
    organization,
    stats,
    members,
    activities,
    auditLogs,
    invoices,
    activitiesPage,
    setActivitiesPage,
    auditLogsPage,
    setAuditLogsPage,
    activitiesTotalPages,
    auditLogsTotalPages,
    activitiesFilters,
    setActivitiesFilters,
    auditFilters,
    setAuditFilters,
    productsList,
    usersList,
    actionsList,
    loadActivities,
    loadAuditLogs,
    loadInvoices,
    refreshData,
    creatorInfo,
    productsByCategory,
    memberActivity,
    movementTrends,
    topProduct,
  } = useOrganizationDetails(id || "");

  const [isEditing, setIsEditing] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<any>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    subscription_plan: 'basic',
    max_users: 10,
    max_products: 1000,
    is_active: true,
  });

  const [subscriptionData] = useState({
    plan: organization?.subscription_plan || 'basic',
    status: 'active',
    billing_cycle: 'monthly',
    next_billing_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    amount: organization?.subscription_plan === 'basic' ? 99.90 : 
            organization?.subscription_plan === 'professional' ? 299.90 : 499.90,
    payment_method: 'credit_card',
  });

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/admin-master");
    }
  }, [isSuperAdmin, navigate]);

  useEffect(() => {
    if (!loading && !organization) {
      toast({
        title: "Organização não encontrada",
        variant: "destructive",
      });
      navigate("/admin-master");
    }
  }, [loading, organization, navigate]);

  // Sync form with organization data
  useEffect(() => {
    if (organization) {
      setEditForm({
        name: organization.name,
        slug: organization.slug,
        subscription_plan: organization.subscription_plan,
        max_users: organization.max_users,
        max_products: organization.max_products,
        is_active: organization.is_active,
      });
    }
  }, [organization]);

  // Reload activities when filters change
  useEffect(() => {
    if (!loading && organization) {
      loadActivities(activitiesPage, activitiesFilters);
    }
  }, [activitiesFilters, activitiesPage]);

  // Reload audit logs when filters change
  useEffect(() => {
    if (!loading && organization) {
      loadAuditLogs(auditLogsPage, auditFilters);
    }
  }, [auditFilters, auditLogsPage]);

  if (loading || !organization) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </MainLayout>
    );
  }

  const usersPercentage = (stats.totalMembers / organization.max_users) * 100;
  const productsPercentage = (stats.totalProducts / organization.max_products) * 100;

  const handleExport = () => {
    const sheets = [
      {
        name: "Informações Gerais",
        data: [{
          Nome: organization.name,
          Slug: organization.slug,
          Plano: organization.subscription_plan,
          Status: organization.is_active ? "Ativa" : "Inativa",
          "Total de Membros": stats.totalMembers,
          "Membros Ativos": stats.activeMembers,
          "Total de Produtos": stats.totalProducts,
          "Total de Movimentos": stats.totalMovements,
          "Total de Alertas": stats.totalAlerts,
        }],
      },
      {
        name: "Membros",
        data: members.map(m => ({
          Nome: m.profiles?.full_name,
          Email: m.profiles?.email,
          Role: m.role,
          Status: m.is_active ? "Ativo" : "Inativo",
          "Data de Entrada": new Date(m.joined_at).toLocaleDateString('pt-BR'),
        })),
      },
    ];

    exportMultiSheetExcel(
      sheets,
      `organizacao_${organization.slug}_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    toast({
      title: "Exportação concluída",
      description: "Dados da organização exportados com sucesso.",
    });
  };

  const handleSaveOrganization = async () => {
    // Validations
    if (!editForm.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "O nome da organização não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    if (!editForm.slug.trim()) {
      toast({
        title: "Slug obrigatório",
        description: "O slug da organização não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    if (editForm.max_users < stats.totalMembers) {
      toast({
        title: "Limite inválido",
        description: `O limite de usuários (${editForm.max_users}) não pode ser menor que o número atual de membros (${stats.totalMembers}).`,
        variant: "destructive",
      });
      return;
    }

    if (editForm.max_products < stats.totalProducts) {
      toast({
        title: "Limite inválido",
        description: `O limite de produtos (${editForm.max_products}) não pode ser menor que o número atual de produtos (${stats.totalProducts}).`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: editForm.name,
          slug: editForm.slug,
          subscription_plan: editForm.subscription_plan,
          max_users: editForm.max_users,
          max_products: editForm.max_products,
          is_active: editForm.is_active,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Organização atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
      
      setIsEditing(false);
      refreshData();
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberToRemove.id);

      if (error) throw error;

      toast({
        title: 'Membro removido',
        description: `${memberToRemove.profiles?.full_name} foi removido da organização.`,
      });

      refreshData();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o membro.',
        variant: 'destructive',
      });
    }
  };

  // Mock data for charts
  const mockChartData = {
    movements: [
      { name: 'Entrada', value: 45 },
      { name: 'Saída', value: 30 },
      { name: 'Transferência', value: 25 },
    ],
    categories: [
      { name: 'Eletrônicos', value: 12 },
      { name: 'Escritório', value: 8 },
      { name: 'Limpeza', value: 15 },
      { name: 'Outros', value: 5 },
    ],
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate("/admin-master")} className="cursor-pointer">
                Admin Master
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{organization.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin-master")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  <span>{organization.name}</span>
                </h1>
                <Badge variant={organization.is_active ? "default" : "destructive"}>
                  {organization.is_active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              <p className="text-muted-foreground">{organization.slug}</p>
            </div>
          </div>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Dados
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Membros</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeMembers} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produtos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                Limite: {organization.max_products}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Movimentos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMovements}</div>
              <p className="text-xs text-muted-foreground">Total registrado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAlerts}</div>
              <p className="text-xs text-muted-foreground">Ativos no sistema</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="members">Membros</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
          <TabsTrigger value="subscription">Assinatura</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Informações Gerais */}
            <OrganizationInfoCard 
              organization={organization} 
              logoUrl={organization.logo_url}
            />

            {/* Resumo Executivo */}
            <ExecutiveSummaryCard
              totalStockValue={stats.totalStockValue}
              topProduct={topProduct}
              topCategory={productsByCategory.length > 0 ? productsByCategory.reduce((max, cat) => cat.count > max.count ? cat : max).category : null}
              memberActivity={memberActivity}
              movementsCount={stats.totalMovements}
            />

            {/* Criador da Organização */}
            {creatorInfo && (
              <CreatorInfoCard 
                creator={creatorInfo}
                createdAt={organization.created_at}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status de Estoque */}
              <Card>
                <CardHeader>
                  <CardTitle>Status de Estoque</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Normal', value: stats.normalStockProducts, fill: 'hsl(var(--primary))' },
                          { name: 'Baixo', value: stats.lowStockProducts, fill: 'hsl(var(--destructive))' },
                          { name: 'Excesso', value: stats.excessStockProducts, fill: 'hsl(var(--warning))' },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        dataKey="value"
                      >
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Produtos por Categoria */}
              <Card>
                <CardHeader>
                  <CardTitle>Produtos por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={productsByCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="count" fill="hsl(var(--primary))" name="Quantidade" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Evolução de Movimentos (últimos 30 dias) */}
            {movementTrends.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Evolução de Movimentos (Últimos 30 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={movementTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                      />
                      <YAxis />
                      <RechartsTooltip 
                        labelFormatter={(value) => format(new Date(value), "dd 'de' MMMM", { locale: ptBR })}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))" 
                        fillOpacity={0.3}
                        name="Movimentos"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Uso de Limites</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Usuários</span>
                      <span className="text-sm text-muted-foreground">
                        {stats.totalMembers} / {organization.max_users}
                      </span>
                    </div>
                    <Progress value={usersPercentage} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Produtos</span>
                      <span className="text-sm text-muted-foreground">
                        {stats.totalProducts} / {organization.max_products}
                      </span>
                    </div>
                    <Progress value={productsPercentage} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Valor em Estoque por Categoria */}
              <Card>
                <CardHeader>
                  <CardTitle>Valor em Estoque por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={productsByCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="category" type="category" width={100} />
                      <RechartsTooltip 
                        formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                      />
                      <Bar dataKey="value" fill="hsl(var(--chart-2))" name="Valor Total" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Membros da Organização</CardTitle>
                    <CardDescription>
                      {stats.totalMembers} de {organization.max_users} membros ativos
                    </CardDescription>
                  </div>
                  
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Convidar Membro
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Exibir uso de membros */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Uso de Membros</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.totalMembers} / {organization.max_users}
                    </span>
                  </div>
                  <Progress 
                    value={(stats.totalMembers / organization.max_users) * 100} 
                    className="h-2"
                  />
                </div>

                <Separator className="my-4" />

                {/* Lista de membros com mais detalhes */}
                <div className="space-y-4">
                  {members.map((member) => {
                    const activity = memberActivity.find(a => a.userId === member.user_id);
                    return (
                      <Card key={member.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <Avatar>
                              <AvatarImage src={member.profiles?.avatar_url} />
                              <AvatarFallback>
                                {member.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{member.profiles?.full_name || 'Sem nome'}</h4>
                                <Badge variant={member.is_active ? "default" : "secondary"}>
                                  {member.is_active ? "Ativo" : "Inativo"}
                                </Badge>
                                {member.role === 'organization_admin' && (
                                  <Badge variant="destructive">Admin</Badge>
                                )}
                              </div>
                              
                              <p className="text-sm text-muted-foreground">{member.profiles?.email}</p>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                <span>Role: {member.role}</span>
                                <span>•</span>
                                <span>Entrou em: {format(new Date(member.joined_at), "dd/MM/yyyy")}</span>
                                {activity && (
                                  <>
                                    <span>•</span>
                                    <span>{activity.movementsCount} movimentos</span>
                                    <span>•</span>
                                    <span>{activity.productsCreated} produtos criados</span>
                                    {activity.lastActivity && (
                                      <>
                                        <span>•</span>
                                        <span>Última atividade: {format(new Date(activity.lastActivity), "dd/MM/yyyy")}</span>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Ações de administrador master */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar Perfil
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Shield className="h-4 w-4 mr-2" />
                                Alterar Permissões
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {member.is_active ? (
                                <DropdownMenuItem className="text-orange-600">
                                  <Ban className="h-4 w-4 mr-2" />
                                  Suspender Acesso
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem className="text-green-600">
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Reativar Acesso
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setMemberToRemove(member);
                                  setShowRemoveDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover da Organização
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Atividades</CardTitle>
                <CardDescription>Movimentações registradas no sistema</CardDescription>
                
                {/* Filters Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  {/* Filter by Movement Type */}
                  <Select 
                    value={activitiesFilters.type} 
                    onValueChange={(value) => {
                      setActivitiesFilters({ ...activitiesFilters, type: value });
                      setActivitiesPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de Movimento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Filter by Product */}
                  <Select 
                    value={activitiesFilters.productId} 
                    onValueChange={(value) => {
                      setActivitiesFilters({ ...activitiesFilters, productId: value });
                      setActivitiesPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Produto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Produtos</SelectItem>
                      {productsList.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Filter by User */}
                  <Select 
                    value={activitiesFilters.userId} 
                    onValueChange={(value) => {
                      setActivitiesFilters({ ...activitiesFilters, userId: value });
                      setActivitiesPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Usuários</SelectItem>
                      {usersList.map(user => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.profiles?.full_name || 'Sem nome'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Filter by Date Range */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {activitiesFilters.dateRange.start ? (
                          activitiesFilters.dateRange.end ? (
                            <>
                              {format(activitiesFilters.dateRange.start, "dd/MM/yy")} -{" "}
                              {format(activitiesFilters.dateRange.end, "dd/MM/yy")}
                            </>
                          ) : (
                            format(activitiesFilters.dateRange.start, "dd/MM/yyyy")
                          )
                        ) : (
                          <span>Período</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={{
                          from: activitiesFilters.dateRange.start || undefined,
                          to: activitiesFilters.dateRange.end || undefined,
                        }}
                        onSelect={(range) => {
                          setActivitiesFilters({
                            ...activitiesFilters,
                            dateRange: {
                              start: range?.from || null,
                              end: range?.to || null,
                            }
                          });
                          setActivitiesPage(1);
                        }}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Clear Filters Button */}
                {(activitiesFilters.type !== 'all' || 
                  activitiesFilters.productId !== 'all' || 
                  activitiesFilters.userId !== 'all' ||
                  activitiesFilters.dateRange.start) && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setActivitiesFilters({
                        type: 'all',
                        productId: 'all',
                        userId: 'all',
                        dateRange: { start: null, end: null }
                      });
                      setActivitiesPage(1);
                    }}
                    className="mt-2"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}

                {/* Results Counter */}
                <p className="text-sm text-muted-foreground mt-2">
                  Exibindo {activities.length} atividades
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {activities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma atividade registrada
                  </p>
                ) : (
                  <>
                    {activities.map((activity) => (
                      <ActivityTimelineItem key={activity.id} movement={activity} />
                    ))}
                    {activitiesTotalPages > 1 && (
                      <Pagination className="mt-4">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setActivitiesPage(Math.max(1, activitiesPage - 1))}
                              className={activitiesPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {[...Array(activitiesTotalPages)].map((_, i) => (
                            <PaginationItem key={i}>
                              <PaginationLink
                                onClick={() => setActivitiesPage(i + 1)}
                                isActive={activitiesPage === i + 1}
                                className="cursor-pointer"
                              >
                                {i + 1}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setActivitiesPage(Math.min(activitiesTotalPages, activitiesPage + 1))}
                              className={activitiesPage === activitiesTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Auditoria</CardTitle>
                <CardDescription>Registro de ações de segurança</CardDescription>
                
                {/* Filters Section */}
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Filter by Action */}
                    <Select 
                      value={auditFilters.action} 
                      onValueChange={(value) => {
                        setAuditFilters({ ...auditFilters, action: value });
                        setAuditLogsPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo de Ação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as Ações</SelectItem>
                        {actionsList.map(action => (
                          <SelectItem key={action} value={action}>
                            {action.replace(/_/g, ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Filter by User */}
                    <Select 
                      value={auditFilters.userId} 
                      onValueChange={(value) => {
                        setAuditFilters({ ...auditFilters, userId: value });
                        setAuditLogsPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Usuários</SelectItem>
                        {usersList.map(user => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.profiles?.full_name || 'Sem nome'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Filter by Date Range */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {auditFilters.dateRange.start ? (
                            auditFilters.dateRange.end ? (
                              <>
                                {format(auditFilters.dateRange.start, "dd/MM/yy")} -{" "}
                                {format(auditFilters.dateRange.end, "dd/MM/yy")}
                              </>
                            ) : (
                              format(auditFilters.dateRange.start, "dd/MM/yyyy")
                            )
                          ) : (
                            <span>Período</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={{
                            from: auditFilters.dateRange.start || undefined,
                            to: auditFilters.dateRange.end || undefined,
                          }}
                          onSelect={(range) => {
                            setAuditFilters({
                              ...auditFilters,
                              dateRange: {
                                start: range?.from || null,
                                end: range?.to || null,
                              }
                            });
                            setAuditLogsPage(1);
                          }}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Search Field */}
                  <Input
                    placeholder="Buscar nos detalhes dos logs..."
                    value={auditFilters.searchTerm}
                    onChange={(e) => {
                      const value = e.target.value;
                      setAuditFilters({ ...auditFilters, searchTerm: value });
                      
                      if (searchDebounceRef.current) {
                        clearTimeout(searchDebounceRef.current);
                      }
                      
                      searchDebounceRef.current = setTimeout(() => {
                        setAuditLogsPage(1);
                      }, 500);
                    }}
                    className="max-w-sm"
                  />

                  {/* Clear Filters Button */}
                  {(auditFilters.action !== 'all' || 
                    auditFilters.userId !== 'all' || 
                    auditFilters.dateRange.start ||
                    auditFilters.searchTerm) && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setAuditFilters({
                          action: 'all',
                          userId: 'all',
                          dateRange: { start: null, end: null },
                          searchTerm: '',
                        });
                        setAuditLogsPage(1);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpar Filtros
                    </Button>
                  )}

                  {/* Results Counter */}
                  <p className="text-sm text-muted-foreground">
                    Exibindo {auditLogs.length} logs de auditoria
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum log de auditoria registrado
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-3 text-left text-sm font-medium">Data/Hora</th>
                            <th className="p-3 text-left text-sm font-medium">Ação</th>
                            <th className="p-3 text-left text-sm font-medium">Usuário</th>
                            <th className="p-3 text-left text-sm font-medium">Detalhes</th>
                            <th className="p-3 text-left text-sm font-medium">IP</th>
                            <th className="p-3 text-left text-sm font-medium">User Agent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs.map((log) => (
                            <AuditLogRow key={log.id} log={log} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {auditLogsTotalPages > 1 && (
                      <Pagination className="mt-4">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setAuditLogsPage(Math.max(1, auditLogsPage - 1))}
                              className={auditLogsPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {[...Array(auditLogsTotalPages)].map((_, i) => (
                            <PaginationItem key={i}>
                              <PaginationLink
                                onClick={() => setAuditLogsPage(i + 1)}
                                isActive={auditLogsPage === i + 1}
                                className="cursor-pointer"
                              >
                                {i + 1}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setAuditLogsPage(Math.min(auditLogsTotalPages, auditLogsPage + 1))}
                              className={auditLogsPage === auditLogsTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes da Assinatura</CardTitle>
                <CardDescription>
                  Informações sobre o plano e billing da organização
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Plano Atual */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Plano Atual</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Plano de Assinatura</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-lg px-3 py-1">
                          {organization.subscription_plan.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {subscriptionData.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Ciclo de Faturamento</Label>
                      <p className="text-sm">
                        {subscriptionData.billing_cycle === 'monthly' ? 'Mensal' : 'Anual'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Próxima Cobrança</Label>
                      <p className="text-sm">
                        {format(subscriptionData.next_billing_date, "dd 'de' MMMM 'de' yyyy")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Valor</Label>
                      <p className="text-sm font-semibold">
                        R$ {subscriptionData.amount.toFixed(2)} / {subscriptionData.billing_cycle === 'monthly' ? 'mês' : 'ano'}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Recursos Incluídos */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Recursos Incluídos</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          <span className="font-medium">Usuários</span>
                        </div>
                        <span className="text-sm font-semibold">
                          {stats.totalMembers} / {organization.max_users}
                        </span>
                      </div>
                      <Progress 
                        value={(stats.totalMembers / organization.max_users) * 100} 
                        className="mt-2 h-2"
                      />
                    </Card>

                    <Card className="p-4 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary" />
                          <span className="font-medium">Produtos</span>
                        </div>
                        <span className="text-sm font-semibold">
                          {stats.totalProducts} / {organization.max_products}
                        </span>
                      </div>
                      <Progress 
                        value={(stats.totalProducts / organization.max_products) * 100} 
                        className="mt-2 h-2"
                      />
                    </Card>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label>Funcionalidades Ativas</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Gestão de Estoque</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Relatórios Básicos</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Alertas de Estoque Baixo</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Movimentações Ilimitadas</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Suporte por Email</span>
                      </div>
                      {organization.subscription_plan === 'professional' && (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Relatórios Avançados</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>API Access</span>
                          </div>
                        </>
                      )}
                      {organization.subscription_plan === 'enterprise' && (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Suporte Prioritário</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Customizações</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Método de Pagamento */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Método de Pagamento</h3>
                  
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    <CreditCard className="h-6 w-6 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">
                        {subscriptionData.payment_method === 'credit_card' ? 'Cartão de Crédito' : 'Boleto Bancário'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {subscriptionData.payment_method === 'credit_card' ? '**** **** **** 1234' : 'Gerado mensalmente'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Alterar
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Faturas */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Faturas</h3>
                    <Button onClick={() => setInvoiceModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Fatura
                    </Button>
                  </div>

                  {invoices && invoices.length > 0 ? (
                    <div className="space-y-2">
                      {invoices.map((invoice) => (
                        <Card key={invoice.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{invoice.invoice_number}</span>
                                <Badge 
                                  variant={
                                    invoice.status === 'paid' ? 'default' : 
                                    invoice.status === 'pending' ? 'secondary' : 
                                    invoice.status === 'overdue' ? 'destructive' : 'outline'
                                  }
                                >
                                  {invoice.status === 'paid' ? 'Pago' : 
                                   invoice.status === 'pending' ? 'Pendente' : 
                                   invoice.status === 'overdue' ? 'Vencido' : 'Cancelado'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Plano: {invoice.subscription_plan}</span>
                                <span>Vencimento: {format(new Date(invoice.due_date), "dd/MM/yyyy")}</span>
                                <span className="font-semibold">
                                  {invoice.currency} {invoice.amount.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {invoice.pdf_url && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-8 text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Nenhuma fatura registrada</p>
                    </Card>
                  )}
                </div>

                <Separator />

                {/* Ações de Administrador Master */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Ações de Administrador</h3>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Alterar Plano
                    </Button>
                    
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Dados de Cobrança
                    </Button>
                    
                    {organization.is_active ? (
                      <Button variant="outline" className="text-orange-600">
                        <Ban className="h-4 w-4 mr-2" />
                        Suspender Assinatura
                      </Button>
                    ) : (
                      <Button variant="outline" className="text-green-600">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Reativar Assinatura
                      </Button>
                    )}
                  </div>
                </div>

                {/* Alerta de Atenção */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Informação Importante</AlertTitle>
                  <AlertDescription>
                    Como super administrador, você pode alterar o plano, limites e status da assinatura desta organização.
                    Mudanças no plano afetarão imediatamente os recursos disponíveis para a organização.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Configurações da Organização</CardTitle>
                    <CardDescription>
                      Edite as informações e limites da organização
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <Button onClick={() => setIsEditing(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => {
                          setIsEditing(false);
                          setEditForm({
                            name: organization.name,
                            slug: organization.slug,
                            subscription_plan: organization.subscription_plan,
                            max_users: organization.max_users,
                            max_products: organization.max_products,
                            is_active: organization.is_active,
                          });
                        }}>
                          <X className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                        <Button onClick={handleSaveOrganization}>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Informações Básicas</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome da Organização</Label>
                      <Input
                        id="name"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Nome da organização"
                      />
                    </div>

                    {/* Slug */}
                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug (URL amigável)</Label>
                      <Input
                        id="slug"
                        value={editForm.slug}
                        onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                        disabled={!isEditing}
                        placeholder="slug-da-organizacao"
                      />
                      <p className="text-xs text-muted-foreground">
                        Usado para identificar a organização em URLs
                      </p>
                    </div>
                  </div>

                  {/* Plan */}
                  <div className="space-y-2">
                    <Label htmlFor="plan">Plano de Assinatura</Label>
                    <Select
                      value={editForm.subscription_plan}
                      onValueChange={(value) => setEditForm({ ...editForm, subscription_plan: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger id="plan">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Limits */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Limites de Recursos</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Max Users */}
                    <div className="space-y-2">
                      <Label htmlFor="max_users">Máximo de Usuários</Label>
                      <Input
                        id="max_users"
                        type="number"
                        min="1"
                        value={editForm.max_users}
                        onChange={(e) => setEditForm({ ...editForm, max_users: parseInt(e.target.value) || 1 })}
                        disabled={!isEditing}
                      />
                      <p className="text-xs text-muted-foreground">
                        Atual: {stats.totalMembers} / {editForm.max_users}
                      </p>
                    </div>

                    {/* Max Products */}
                    <div className="space-y-2">
                      <Label htmlFor="max_products">Máximo de Produtos</Label>
                      <Input
                        id="max_products"
                        type="number"
                        min="1"
                        value={editForm.max_products}
                        onChange={(e) => setEditForm({ ...editForm, max_products: parseInt(e.target.value) || 1 })}
                        disabled={!isEditing}
                      />
                      <p className="text-xs text-muted-foreground">
                        Atual: {stats.totalProducts} / {editForm.max_products}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Status */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Status</h3>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={editForm.is_active}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                      disabled={!isEditing}
                    />
                    <Label htmlFor="is_active" className="cursor-pointer">
                      Organização Ativa
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {editForm.is_active 
                      ? "A organização está ativa e pode ser acessada normalmente." 
                      : "A organização está inativa. Os membros não poderão acessar o sistema."}
                  </p>
                </div>

                <Separator />

                {/* Danger Zone */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-destructive">Zona de Perigo</h3>
                  
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Atenção!</AlertTitle>
                    <AlertDescription>
                      As ações abaixo são irreversíveis. Tenha certeza antes de prosseguir.
                    </AlertDescription>
                  </Alert>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deletar Organização
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso irá deletar permanentemente a
                          organização <strong>{organization.name}</strong>, todos os seus dados,
                          membros, produtos e movimentações.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('organizations')
                                .delete()
                                .eq('id', id);

                              if (error) throw error;

                              toast({
                                title: "Organização deletada",
                                description: "A organização foi removida permanentemente.",
                              });
                              
                              navigate('/admin-master');
                            } catch (error: any) {
                              toast({
                                title: "Erro ao deletar",
                                description: error.message,
                                variant: "destructive",
                              });
                            }
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Sim, deletar organização
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de Confirmação de Remoção */}
        {memberToRemove && (
          <RemoveMemberDialog
            open={showRemoveDialog}
            onOpenChange={setShowRemoveDialog}
            member={memberToRemove}
            activity={memberActivity.find(a => a.userId === memberToRemove.user_id)}
            onConfirm={handleRemoveMember}
          />
        )}
      </div>

      <InvoiceModal 
        open={invoiceModalOpen} 
        onOpenChange={setInvoiceModalOpen}
        organizationId={id || ""}
        onSuccess={loadInvoices}
      />
    </MainLayout>
  );
}
