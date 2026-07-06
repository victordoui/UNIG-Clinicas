import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GlobalSettingsSection } from "@/components/super-admin/GlobalSettingsSection";
import { SuperAdminManagement } from "@/components/super-admin/SuperAdminManagement";
import { 
  Settings, 
  Package, 
  Shield, 
  Palette,
  Database,
  Download,
  Upload,
  Crown,
  Bell
} from "lucide-react";
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";
import { ApprovalThresholdsSection } from "@/components/purchases/ApprovalThresholdsSection";
import { CostCentersSection } from "@/components/purchases/CostCentersSection";
import { BudgetsSection } from "@/components/purchases/BudgetsSection";
import { BankAccountsSection } from "@/components/financial/BankAccountsSection";
import { Workflow, Building2, PiggyBank } from "lucide-react";

interface SettingsData {
  company_name: string;
  contact_email: string;
  currency: string;
  timezone: string;
  notifications_enabled: boolean;
}

export default function Configuracoes() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  
  const [settings, setSettings] = useState<SettingsData>({
    company_name: "UNIG Facilities",
    contact_email: "admin@unigops.com",
    currency: "BRL",
    timezone: "America/Sao_Paulo",
    notifications_enabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const settingsData = data[0].setting_value as unknown as SettingsData;
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          setting_key: 'general_settings',
          setting_value: settings as any
        });

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "As configurações foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      toast({
        title: "Iniciando backup...",
        description: "Coletando dados de todas as tabelas do banco.",
      });

      // Fetch all data from ALL tables in the database
      const [
        { data: products },
        { data: movements },
        { data: profiles },
        { data: settings },
        { data: categoryNotifications },
        { data: userApprovals },
        { data: activeSessions },
        { data: alerts },
        { data: alertSuppressions },
        { data: loginAttempts },
        { data: securityAuditLog },
        { data: userBans }
      ] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('movements').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('settings').select('*'),
        supabase.from('category_notifications').select('*'),
        supabase.from('user_approvals').select('*'),
        supabase.from('active_sessions').select('*'),
        supabase.from('alerts').select('*'),
        supabase.from('alert_suppressions').select('*'),
        supabase.from('login_attempts').select('*'),
        supabase.from('security_audit_log').select('*'),
        supabase.from('user_bans').select('*')
      ]);

      const backupData = {
        timestamp: new Date().toISOString(),
        version: '2.0', // Updated version for complete backup
        database_name: 'UNIG_Ops_Complete_Backup',
        total_records: (products?.length || 0) + (movements?.length || 0) + (profiles?.length || 0) + 
                      (settings?.length || 0) + (categoryNotifications?.length || 0) + (userApprovals?.length || 0) +
                      (activeSessions?.length || 0) + (alerts?.length || 0) + (alertSuppressions?.length || 0) +
                      (loginAttempts?.length || 0) + (securityAuditLog?.length || 0) + (userBans?.length || 0),
        tables: {
          // Core business data
          products: products || [],
          movements: movements || [],
          profiles: profiles || [],
          
          // System configuration
          settings: settings || [],
          category_notifications: categoryNotifications || [],
          
          // User management
          user_approvals: userApprovals || [],
          user_bans: userBans || [],
          
          // Security and monitoring
          active_sessions: activeSessions || [],
          login_attempts: loginAttempts || [],
          security_audit_log: securityAuditLog || [],
          
          // Alerts system
          alerts: alerts || [],
          alert_suppressions: alertSuppressions || []
        },
        metadata: {
          backup_type: 'complete',
          source_project: 'jlsulupcpjranljgxmvn',
          created_by: 'admin',
          schema_version: 'latest'
        }
      };

      // Create comprehensive backup file with detailed naming
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `UNIG_Ops_Complete_Backup_${timestamp}.json`;
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup completo realizado com sucesso!",
        description: `${backupData.total_records} registros salvos em ${filename}. Use este arquivo para restaurar em outro banco de dados.`,
      });
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: "Erro no backup",
        description: "Não foi possível criar o backup.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      toast({
        title: "Iniciando restauração...",
        description: "Lendo arquivo de backup e validando dados.",
      });

      const text = await file.text();
      const backupData = JSON.parse(text);
      
      // Validate backup file format (support both v1.0 and v2.0)
      const isOldFormat = backupData.data && backupData.version === '1.0';
      const isNewFormat = backupData.tables && backupData.version === '2.0';
      
      if (!isOldFormat && !isNewFormat) {
        throw new Error('Arquivo de backup inválido ou versão não suportada');
      }

      // Get confirmation before clearing data
      const confirmed = window.confirm(
        `ATENÇÃO: Esta operação irá SUBSTITUIR todos os dados atuais do banco!\n\n` +
        `Arquivo: ${file.name}\n` +
        `Data do backup: ${backupData.timestamp}\n` +
        `Total de registros: ${backupData.total_records || 'N/A'}\n\n` +
        `Deseja continuar? Esta ação NÃO pode ser desfeita!`
      );
      
      if (!confirmed) {
        toast({
          title: "Restauração cancelada",
          description: "Nenhum dado foi alterado.",
        });
        return;
      }

      toast({
        title: "Limpando dados existentes...",
        description: "Removendo dados atuais antes da restauração.",
      });

      // Clear ALL existing data from tables (except some critical auth/security data)
      await Promise.all([
        supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('movements').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('settings').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('category_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('user_approvals').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('active_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('alert_suppressions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        // Note: We don't clear login_attempts, security_audit_log, user_bans for security reasons
      ]);

      toast({
        title: "Restaurando dados...",
        description: "Inserindo dados do backup no banco de dados.",
      });

      // Restore data - handle both old and new format
      const dataToRestore = isNewFormat ? backupData.tables : backupData.data;
      
      const restorePromises = [];
      
      // Core business data
      if (dataToRestore.products?.length > 0) {
        restorePromises.push(supabase.from('products').insert(dataToRestore.products));
      }
      
      if (dataToRestore.movements?.length > 0) {
        restorePromises.push(supabase.from('movements').insert(dataToRestore.movements));
      }
      
      // Sanitize profiles - exclude sensitive fields to prevent privilege escalation
      if (dataToRestore.profiles?.length > 0) {
        const sanitizedProfiles = dataToRestore.profiles.map((profile: any) => {
          const { is_super_admin, password_change_required, ...safeProfile } = profile;
          return {
            ...safeProfile,
            // Force password change for security
            password_change_required: true
          };
        });
        restorePromises.push(supabase.from('profiles').insert(sanitizedProfiles));
      }
      
      // System configuration
      if (dataToRestore.settings?.length > 0) {
        restorePromises.push(supabase.from('settings').insert(dataToRestore.settings));
      }
      
      if (dataToRestore.category_notifications?.length > 0) {
        restorePromises.push(supabase.from('category_notifications').insert(dataToRestore.category_notifications));
      }
      
      // User management
      if (dataToRestore.user_approvals?.length > 0) {
        restorePromises.push(supabase.from('user_approvals').insert(dataToRestore.user_approvals));
      }
      
      if (dataToRestore.user_bans?.length > 0) {
        restorePromises.push(supabase.from('user_bans').insert(dataToRestore.user_bans));
      }
      
      // Sessions and alerts
      if (dataToRestore.active_sessions?.length > 0) {
        restorePromises.push(supabase.from('active_sessions').insert(dataToRestore.active_sessions));
      }
      
      if (dataToRestore.alerts?.length > 0) {
        restorePromises.push(supabase.from('alerts').insert(dataToRestore.alerts));
      }
      
      if (dataToRestore.alert_suppressions?.length > 0) {
        restorePromises.push(supabase.from('alert_suppressions').insert(dataToRestore.alert_suppressions));
      }

      // Execute all restore operations
      await Promise.all(restorePromises);

      // Reload settings to reflect restored data
      await loadSettings();

      toast({
        title: "Restauração completa realizada com sucesso!",
        description: `Todos os dados foram restaurados do backup ${file.name}. O sistema foi atualizado.`,
      });
      
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast({
        title: "Erro na restauração",
        description: `Falha ao restaurar backup: ${error.message}. Verifique se o arquivo é válido.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Configurações
          </h1>
          <p className="text-muted-foreground text-lg font-medium mt-2">
            Personalize as configurações do sistema
          </p>
        </div>

        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList className="w-full overflow-x-auto flex-nowrap whitespace-nowrap justify-start h-auto">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="notificacoes">
              <Bell className="h-4 w-4 mr-1 hidden sm:inline" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="estoque">Estoque</TabsTrigger>
            <TabsTrigger value="aparencia">Aparência</TabsTrigger>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="aprovacoes">
              <Workflow className="h-4 w-4 mr-1 hidden sm:inline" />
              Aprovações
            </TabsTrigger>
            <TabsTrigger value="centros-custo">
              <Building2 className="h-4 w-4 mr-1 hidden sm:inline" />
              Centros de custo
            </TabsTrigger>
            <TabsTrigger value="orcamentos">
              <PiggyBank className="h-4 w-4 mr-1 hidden sm:inline" />
              Orçamentos
            </TabsTrigger>
            <TabsTrigger value="contas-bancarias">
              Contas bancárias
            </TabsTrigger>
            {profile?.is_super_admin && (
              <>
                <TabsTrigger value="global">
                  <Crown className="h-4 w-4 mr-2" />
                  Configurações Globais
                </TabsTrigger>
                <TabsTrigger value="super-admins">
                  <Crown className="h-4 w-4 mr-2" />
                  Super Admins
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="aprovacoes" className="space-y-6">
            <ApprovalThresholdsSection />
          </TabsContent>

          <TabsContent value="centros-custo" className="space-y-6">
            <CostCentersSection />
          </TabsContent>

          <TabsContent value="orcamentos" className="space-y-6">
            <BudgetsSection />
          </TabsContent>

          <TabsContent value="contas-bancarias" className="space-y-6">
            <BankAccountsSection />
          </TabsContent>

          <TabsContent value="geral" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações Gerais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Nome da Empresa</label>
                    <Input 
                      value={settings.company_name} 
                      onChange={(e) => setSettings(prev => ({ ...prev, company_name: e.target.value }))}
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email de Contato</label>
                    <Input 
                      type="email" 
                      value={settings.contact_email}
                      onChange={(e) => setSettings(prev => ({ ...prev, contact_email: e.target.value }))}
                      className="mt-1" 
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveSettings} disabled={loading}>
                    {loading ? "Salvando..." : "Salvar Configurações"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notificacoes" className="space-y-6">
            <PushNotificationToggle />
          </TabsContent>

          <TabsContent value="estoque" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Configurações de Estoque
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configurações de estoque em breve...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aparencia" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Configurações de Aparência
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configurações de aparência em breve...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dados" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Backup Completo e Migração de Dados
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Faça backup de TODOS os dados do sistema ou restaure um backup completo.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">i</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">Backup Completo</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Este backup inclui TODAS as tabelas: produtos, movimentações, usuários, configurações, 
                        alertas, logs de segurança e muito mais. Perfeito para migração entre bancos de dados.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium">Ações de Backup</h4>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      variant="default" 
                      onClick={handleBackup}
                      disabled={loading}
                      className="flex-1"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {loading ? "Gerando Backup..." : "Download Backup Completo"}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => document.getElementById('restore-input')?.click()}
                      disabled={loading}
                      className="flex-1"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Restaurar Backup
                    </Button>
                    <input
                      id="restore-input"
                      type="file"
                      accept=".json"
                      onChange={handleRestore}
                      className="hidden"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {profile?.is_super_admin && (
            <>
              <TabsContent value="global" className="space-y-6">
                <GlobalSettingsSection />
              </TabsContent>

              <TabsContent value="super-admins" className="space-y-6">
                <SuperAdminManagement />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}