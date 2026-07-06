import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Package, Building2, Eye, Search, Download, Loader2, X, ChevronDown, ChevronUp, Edit, UserPlus, MoreVertical, Trash2, Shield } from 'lucide-react';
import { CreateOrganizationModal } from '@/components/organizations/CreateOrganizationModal';
import { EditOrganizationModal } from '@/components/organizations/EditOrganizationModal';
import { AddMemberModal } from '@/components/organizations/AddMemberModal';
import { ChangeOrganizationRoleModal } from '@/components/organizations/ChangeOrganizationRoleModal';
import { MemberCard } from '@/components/admin/MemberCard';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

import { exportToExcel } from '@/lib/exportUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Organization {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  subscription_plan: string;
  max_users: number;
  max_products: number;
  created_at: string;
  member_count?: number;
  product_count?: number;
}

interface OrganizationMember {
  id: string;
  role: string;
  is_active: boolean;
  joined_at: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export default function AdminMaster() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [orgMembers, setOrgMembers] = useState<Record<string, OrganizationMember[]>>({});
  
  // New modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedOrgForEdit, setSelectedOrgForEdit] = useState<Organization | null>(null);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [selectedOrgForMember, setSelectedOrgForMember] = useState<Organization | null>(null);
  const [changeRoleModalOpen, setChangeRoleModalOpen] = useState(false);
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<OrganizationMember | null>(null);
  const [selectedOrgName, setSelectedOrgName] = useState<string>('');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [isSuperAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadData();
    }
  }, [isSuperAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Load member counts
      const { data: memberCounts } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('is_active', true);

      // Load product counts
      const { data: productCounts } = await supabase
        .from('products')
        .select('organization_id');

      // Calculate counts per organization
      const orgsWithCounts = orgsData?.map(org => {
        const memberCount = memberCounts?.filter(m => m.organization_id === org.id).length || 0;
        const productCount = productCounts?.filter(p => p.organization_id === org.id).length || 0;
        
        return {
          ...org,
          member_count: memberCount,
          product_count: productCount
        };
      }) || [];

      setOrganizations(orgsWithCounts);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered organizations
  const filteredOrganizations = useMemo(() => {
    let filtered = [...organizations];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter === "active") {
      filtered = filtered.filter(org => org.is_active);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter(org => !org.is_active);
    }

    // Plan filter
    if (planFilter !== "all") {
      filtered = filtered.filter(org => org.subscription_plan === planFilter);
    }

    return filtered;
  }, [organizations, searchTerm, statusFilter, planFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPlanFilter("all");
  };

  const loadOrganizationMembers = async (orgId: string) => {
    // Se já carregamos os membros desta organização, apenas expandir/recolher
    if (orgMembers[orgId]) {
      setExpandedOrgId(expandedOrgId === orgId ? null : orgId);
      return;
    }

    try {
      setLoadingMembers(true);
      console.log('🔍 Carregando membros para organização:', orgId);
      
      // Query 1: Buscar membros
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('id, role, is_active, joined_at, user_id')
        .eq('organization_id', orgId)
        .order('joined_at', { ascending: false });

      if (membersError) {
        console.error('❌ Erro ao buscar membros:', membersError);
        throw membersError;
      }
      
      console.log('📊 Membros encontrados:', members);

      if (!members || members.length === 0) {
        setOrgMembers(prev => ({ ...prev, [orgId]: [] }));
        setExpandedOrgId(orgId);
        return;
      }

      // Query 2: Buscar perfis dos usuários
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('❌ Erro ao buscar perfis:', profilesError);
        throw profilesError;
      }
      
      console.log('📊 Perfis encontrados:', profiles);

      // Combinar dados
      const membersWithProfiles = members.map(member => ({
        ...member,
        profiles: profiles?.find(p => p.id === member.user_id) || {
          full_name: 'Usuário não encontrado',
          email: '',
          avatar_url: null
        }
      }));

      setOrgMembers(prev => ({
        ...prev,
        [orgId]: membersWithProfiles as OrganizationMember[]
      }));
      setExpandedOrgId(orgId);
      
    } catch (error: any) {
      console.error('❌ Erro ao carregar membros:', error);
      toast({
        title: "Erro ao carregar membros",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const reloadOrganizationMembers = async (orgId: string) => {
    try {
      setLoadingMembers(true);
      console.log('🔄 Recarregando membros para organização:', orgId);
      
      // Query 1: Buscar membros
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('id, role, is_active, joined_at, user_id')
        .eq('organization_id', orgId)
        .order('joined_at', { ascending: false });

      if (membersError) throw membersError;

      if (!members || members.length === 0) {
        setOrgMembers(prev => ({ ...prev, [orgId]: [] }));
        return;
      }

      // Query 2: Buscar perfis dos usuários
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combinar dados
      const membersWithProfiles = members.map(member => ({
        ...member,
        profiles: profiles?.find(p => p.id === member.user_id) || {
          full_name: 'Usuário não encontrado',
          email: '',
          avatar_url: null
        }
      }));

      setOrgMembers(prev => ({
        ...prev,
        [orgId]: membersWithProfiles as OrganizationMember[]
      }));

      // Recarregar contagens também
      await loadData();
      
    } catch (error: any) {
      console.error('❌ Erro ao recarregar membros:', error);
      toast({
        title: "Erro ao recarregar membros",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleExportToExcel = () => {
    const exportData = filteredOrganizations.map(org => ({
      "Nome": org.name,
      "Slug": org.slug,
      "Status": org.is_active ? "Ativa" : "Inativa",
      "Plano": org.subscription_plan || "N/A",
      "Membros": org.member_count || 0,
      "Limite de Membros": org.max_users || 0,
      "% Uso Membros": org.max_users ? ((org.member_count || 0) / org.max_users * 100).toFixed(1) + "%" : "0%",
      "Produtos": org.product_count || 0,
      "Limite de Produtos": org.max_products || 0,
      "% Uso Produtos": org.max_products ? ((org.product_count || 0) / org.max_products * 100).toFixed(1) + "%" : "0%",
      "Criada em": new Date(org.created_at).toLocaleDateString('pt-BR'),
    }));

    const fileName = `organizacoes_${new Date().toISOString().split('T')[0]}.xlsx`;
    exportToExcel(exportData, fileName, "Organizações");

    toast({
      title: "Exportação concluída",
      description: `${exportData.length} organizações exportadas com sucesso.`,
    });
  };

  const handleRemoveMemberFromList = async (orgId: string, memberId: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Membro removido com sucesso",
      });

      // Usar a nova função de recarregamento
      await reloadOrganizationMembers(orgId);
      
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o membro",
        variant: "destructive",
      });
    }
  };

  const handleRoleChangeSuccess = async () => {
    if (selectedOrgForMember?.id || expandedOrgId) {
      const orgId = selectedOrgForMember?.id || expandedOrgId;
      if (orgId) {
        await reloadOrganizationMembers(orgId);
      }
    }
  };

  const handleDeleteOrganization = async (orgId: string, orgName: string) => {
    try {
      setLoading(true);

      // Deletar a organização (CASCADE irá remover dados relacionados)
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgId);

      if (error) {
        console.error('❌ Erro ao excluir organização:', error);
        throw error;
      }

      toast({
        title: "✅ Organização excluída",
        description: `A organização "${orgName}" foi removida permanentemente.`,
      });

      // Recarregar lista de organizações
      await loadData();

      // Se estava expandida, fechar
      if (expandedOrgId === orgId) {
        setExpandedOrgId(null);
        setOrgMembers(prev => {
          const newMembers = { ...prev };
          delete newMembers[orgId];
          return newMembers;
        });
      }

    } catch (error: any) {
      console.error('❌ Erro ao excluir organização:', error);
      toast({
        title: "Erro ao excluir organização",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'organization_admin':
        return 'destructive' as const;
      case 'manager':
        return 'default' as const;
      default:
        return 'secondary' as const;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'organization_admin':
        return 'Administrador';
      case 'manager':
        return 'Gerente';
      case 'user':
        return 'Usuário';
      default:
        return role;
    }
  };


  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Organizações
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie todas as organizações do sistema
            </p>
          </div>
          <Button size="lg" className="gap-2" onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova Organização
          </Button>
        </div>

        {/* Organizations List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organizações Cadastradas</CardTitle>
                  <CardDescription>
                    Gerencie todas as empresas que utilizam o sistema
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {filteredOrganizations.length} {filteredOrganizations.length === 1 ? 'resultado' : 'resultados'}
                </Badge>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou slug..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={statusFilter} onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="active">Ativas</SelectItem>
                    <SelectItem value="inactive">Inativas</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Planos</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters Button */}
              {(searchTerm || statusFilter !== "all" || planFilter !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearFilters}
                  className="w-fit gap-2"
                >
                  <X className="h-4 w-4" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredOrganizations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma organização encontrada com os filtros aplicados.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrganizations.map((org) => (
                <div
                  key={org.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{org.name}</h3>
                          <Badge variant={org.is_active ? "default" : "secondary"}>
                            {org.is_active ? "Ativa" : "Inativa"}
                          </Badge>
                          <Badge variant="outline">{org.subscription_plan}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          /{org.slug}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {org.member_count || 0} / {org.max_users} usuários
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {org.product_count || 0} / {org.max_products} produtos
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => loadOrganizationMembers(org.id)}
                        disabled={loadingMembers}
                      >
                        {loadingMembers && expandedOrgId === org.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : expandedOrgId === org.id ? (
                          <ChevronUp className="h-4 w-4 mr-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 mr-2" />
                        )}
                        Ver Membros
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin-master/organization/${org.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalhes Completos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedOrgForEdit(org);
                            setEditModalOpen(true);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar Organização
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedOrgForMember(org);
                            setAddMemberModalOpen(true);
                          }}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Adicionar Membro
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                onSelect={(e) => e.preventDefault()} 
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir Organização
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Organização</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a organização <strong>{org.name}</strong>?
                                  <br /><br />
                                  <span className="text-destructive font-semibold">⚠️ ATENÇÃO:</span> Esta ação é irreversível e irá remover:
                                  <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>{org.member_count || 0} membro(s)</li>
                                    <li>{org.product_count || 0} produto(s)</li>
                                    <li>Todos os movimentos relacionados</li>
                                    <li>Todos os alertas relacionados</li>
                                  </ul>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteOrganization(org.id, org.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir Permanentemente
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Membros expandidos */}
                  {expandedOrgId === org.id && orgMembers[org.id] && (
                    <div className="border-t bg-muted/30 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Membros ({orgMembers[org.id].length}/{org.max_users})
                        </h4>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedOrgForMember(org);
                            setAddMemberModalOpen(true);
                          }}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Adicionar Membro
                        </Button>
                      </div>
                      {orgMembers[org.id].length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nenhum membro nesta organização.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {orgMembers[org.id].map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 bg-card rounded-lg border"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={member.profiles.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {member.profiles.full_name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{member.profiles.full_name}</p>
                                  <p className="text-xs text-muted-foreground">{member.profiles.email}</p>
                                  <div className="flex gap-2 mt-1">
                                    <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                                      {getRoleLabel(member.role)}
                                    </Badge>
                                    <Badge variant={member.is_active ? 'default' : 'secondary'} className="text-xs">
                                      {member.is_active ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(member.joined_at), 'dd/MM/yyyy')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => navigate(`/admin-master/organization/${org.id}`)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver Detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setSelectedMemberForRole(member);
                                        setSelectedOrgName(org.name);
                                        setChangeRoleModalOpen(true);
                                      }}
                                    >
                                      <Shield className="h-4 w-4 mr-2" />
                                      Alterar Nível de Acesso
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                
                                {/* Manter AlertDialog separado */}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remover Membro</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja remover {member.profiles.full_name} desta organização?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleRemoveMemberFromList(org.id, member.id)}>
                                        Remover
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <CreateOrganizationModal 
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={loadData}
      />
      
      <EditOrganizationModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        organization={selectedOrgForEdit}
        onSuccess={loadData}
      />
      
      <AddMemberModal
        open={addMemberModalOpen}
        onOpenChange={setAddMemberModalOpen}
        organization={selectedOrgForMember}
        onSuccess={async () => {
          if (selectedOrgForMember?.id) {
            await reloadOrganizationMembers(selectedOrgForMember.id);
          }
        }}
      />

      {selectedMemberForRole && (
        <ChangeOrganizationRoleModal
          open={changeRoleModalOpen}
          onOpenChange={setChangeRoleModalOpen}
          member={selectedMemberForRole}
          organizationName={selectedOrgName}
          onSuccess={handleRoleChangeSuccess}
        />
      )}
    </MainLayout>
  );
}
