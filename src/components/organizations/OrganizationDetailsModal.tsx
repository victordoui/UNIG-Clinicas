import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  Users, 
  Package, 
  Activity, 
  Settings,
  Loader2,
  Trash2,
  Shield
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface OrganizationDetailsModalProps {
  organizationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  subscription_plan: string;
  max_users: number;
  max_products: number;
  created_at: string;
  logo_url?: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  is_active: boolean;
  profiles: {
    full_name: string;
    email: string;
  };
}

export function OrganizationDetailsModal({
  organizationId,
  open,
  onOpenChange,
  onUpdate,
}: OrganizationDetailsModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState({
    products: 0,
    movements: 0,
    alerts: 0,
  });

  useEffect(() => {
    if (organizationId && open) {
      loadOrganizationData();
    }
  }, [organizationId, open]);

  const loadOrganizationData = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      // Load organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;
      setOrganization(orgData);

      // Load members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId);

      if (membersError) throw membersError;

      // Load profiles for each member
      const memberIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', memberIds);

      // Combine members with profiles
      const membersWithProfiles = membersData?.map(member => {
        const profile = profilesData?.find(p => p.id === member.user_id);
        return {
          ...member,
          profiles: {
            full_name: profile?.full_name || 'Desconhecido',
            email: profile?.email || 'N/A',
          },
        };
      }) || [];

      setMembers(membersWithProfiles);

      // Load statistics
      const [productsRes, movementsRes, alertsRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact' }).eq('organization_id', organizationId),
        supabase.from('movements').select('id', { count: 'exact' }).eq('organization_id', organizationId),
        supabase.from('alerts').select('id', { count: 'exact' }).eq('organization_id', organizationId),
      ]);

      setStats({
        products: productsRes.count || 0,
        movements: movementsRes.count || 0,
        alerts: alertsRes.count || 0,
      });

    } catch (error: any) {
      console.error('Error loading organization:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados da organização.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrganization = async (updates: Partial<OrganizationData>) => {
    if (!organizationId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organizationId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Organização atualizada com sucesso.',
      });

      setOrganization((prev) => prev ? { ...prev, ...updates } : null);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar organização.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Membro removido com sucesso.',
      });

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      onUpdate();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover membro.',
        variant: 'destructive',
      });
    }
  };

  if (!organization && !loading) return null;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {organization?.name || 'Carregando...'}
          </ModalTitle>
        </ModalHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="members">Membros</TabsTrigger>
              <TabsTrigger value="stats">Estatísticas</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Nome</Label>
                      <p className="font-medium">{organization?.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Slug</Label>
                      <p className="font-mono text-sm">{organization?.slug}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Plano</Label>
                      <Badge variant="outline" className="mt-1">
                        {organization?.subscription_plan}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <Badge variant={organization?.is_active ? 'default' : 'secondary'} className="mt-1">
                        {organization?.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Criada em</Label>
                      <p className="text-sm">
                        {organization?.created_at
                          ? new Date(organization.created_at).toLocaleDateString('pt-BR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Limites</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Usuários</Label>
                    <p className="text-2xl font-bold">
                      {members.filter(m => m.is_active).length} / {organization?.max_users}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Produtos</Label>
                    <p className="text-2xl font-bold">
                      {stats.products} / {organization?.max_products}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Membros da Organização ({members.length})
                  </CardTitle>
                  <CardDescription>
                    Gerencie os usuários que fazem parte desta organização
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {member.profiles.full_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.profiles.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {member.profiles.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.role === 'organization_admin' ? 'default' : 'secondary'}>
                            {member.role === 'organization_admin' ? (
                              <Shield className="h-3 w-3 mr-1" />
                            ) : null}
                            {member.role}
                          </Badge>
                          <Badge variant={member.is_active ? 'outline' : 'secondary'}>
                            {member.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {members.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum membro encontrado
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Statistics Tab */}
            <TabsContent value="stats" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Produtos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <span className="text-3xl font-bold">{stats.products}</span>
                    </div>
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
                      <span className="text-3xl font-bold">{stats.movements}</span>
                    </div>
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
                      <Activity className="h-5 w-5 text-primary" />
                      <span className="text-3xl font-bold">{stats.alerts}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configurações da Organização
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="org_name">Nome da Organização</Label>
                    <Input
                      id="org_name"
                      value={organization?.name}
                      onChange={(e) =>
                        setOrganization((prev) => prev ? { ...prev, name: e.target.value } : null)
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="plan">Plano</Label>
                      <Select
                        value={organization?.subscription_plan}
                        onValueChange={(value) =>
                          setOrganization((prev) => prev ? { ...prev, subscription_plan: value } : null)
                        }
                        disabled={saving}
                      >
                        <SelectTrigger id="plan">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Básico</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max_users_setting">Limite de Usuários</Label>
                      <Input
                        id="max_users_setting"
                        type="number"
                        min="1"
                        value={organization?.max_users}
                        onChange={(e) =>
                          setOrganization((prev) =>
                            prev ? { ...prev, max_users: parseInt(e.target.value) || 10 } : null
                          )
                        }
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_products_setting">Limite de Produtos</Label>
                      <Input
                        id="max_products_setting"
                        type="number"
                        min="1"
                        value={organization?.max_products}
                        onChange={(e) =>
                          setOrganization((prev) =>
                            prev ? { ...prev, max_products: parseInt(e.target.value) || 1000 } : null
                          )
                        }
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="is_active">Organização Ativa</Label>
                      <p className="text-sm text-muted-foreground">
                        Desativar impedirá o acesso dos usuários
                      </p>
                    </div>
                    <Switch
                      id="is_active"
                      checked={organization?.is_active}
                      onCheckedChange={(checked) =>
                        setOrganization((prev) => prev ? { ...prev, is_active: checked } : null)
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => loadOrganizationData()}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() =>
                        organization && handleUpdateOrganization({
                          name: organization.name,
                          subscription_plan: organization.subscription_plan,
                          max_users: organization.max_users,
                          max_products: organization.max_products,
                          is_active: organization.is_active,
                        })
                      }
                      disabled={saving}
                    >
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Alterações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </ModalContent>
    </Modal>
  );
}
