import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, Shield } from "lucide-react";

interface OrganizationDefaults {
  max_users: number;
  max_products: number;
  subscription_plan: string;
}

interface SecuritySettings {
  require_user_approval: boolean;
  enable_2fa: boolean;
  max_session_time_minutes: number;
  max_login_attempts: number;
  lockout_duration_minutes: number;
}

export function GlobalSettingsSection() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [orgDefaults, setOrgDefaults] = useState<OrganizationDefaults>({
    max_users: 10,
    max_products: 1000,
    subscription_plan: "basic"
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    require_user_approval: true,
    enable_2fa: false,
    max_session_time_minutes: 480,
    max_login_attempts: 5,
    lockout_duration_minutes: 30
  });

  useEffect(() => {
    loadGlobalSettings();
  }, []);

  const loadGlobalSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*');

      if (error) throw error;

      if (data && data.length > 0) {
        data.forEach(setting => {
          if (setting.setting_key === 'organization_defaults') {
            setOrgDefaults(setting.setting_value as unknown as OrganizationDefaults);
          } else if (setting.setting_key === 'security_settings') {
            setSecuritySettings(setting.setting_value as unknown as SecuritySettings);
          }
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações globais:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as configurações globais.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveGlobalSettings = async () => {
    setSaving(true);
    try {
      // Salvar limites padrão de organização
      const { error: orgError } = await supabase
        .from('global_settings')
        .upsert({
          setting_key: 'organization_defaults',
          setting_value: orgDefaults as any
        });

      if (orgError) throw orgError;

      // Salvar configurações de segurança
      const { error: secError } = await supabase
        .from('global_settings')
        .upsert({
          setting_key: 'security_settings',
          setting_value: securitySettings as any
        });

      if (secError) throw secError;

      toast({
        title: "Configurações salvas",
        description: "As configurações globais foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar configurações globais:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações globais.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando configurações globais...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Limites Padrão para Organizações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Limites Padrão para Organizações</CardTitle>
              <CardDescription>
                Defina os limites padrão aplicados ao criar novas organizações
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_users">Máximo de Usuários</Label>
              <Input
                id="max_users"
                type="number"
                min="1"
                value={orgDefaults.max_users}
                onChange={(e) => setOrgDefaults({...orgDefaults, max_users: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_products">Máximo de Produtos</Label>
              <Input
                id="max_products"
                type="number"
                min="1"
                value={orgDefaults.max_products}
                onChange={(e) => setOrgDefaults({...orgDefaults, max_products: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscription_plan">Plano Padrão</Label>
              <Select
                value={orgDefaults.subscription_plan}
                onValueChange={(value) => setOrgDefaults({...orgDefaults, subscription_plan: value})}
              >
                <SelectTrigger id="subscription_plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Segurança Global */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle>Configurações de Segurança Global</CardTitle>
              <CardDescription>
                Defina as políticas de segurança aplicadas em todo o sistema
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Exigir aprovação de novos usuários</Label>
              <p className="text-sm text-muted-foreground">
                Novos usuários precisam ser aprovados antes de acessar o sistema
              </p>
            </div>
            <Switch
              checked={securitySettings.require_user_approval}
              onCheckedChange={(checked) => setSecuritySettings({...securitySettings, require_user_approval: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Habilitar autenticação de dois fatores</Label>
              <p className="text-sm text-muted-foreground">
                Exigir 2FA para todos os usuários do sistema
              </p>
            </div>
            <Switch
              checked={securitySettings.enable_2fa}
              onCheckedChange={(checked) => setSecuritySettings({...securitySettings, enable_2fa: checked})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session_time">Tempo máximo de sessão (minutos)</Label>
              <Input
                id="session_time"
                type="number"
                min="1"
                value={securitySettings.max_session_time_minutes}
                onChange={(e) => setSecuritySettings({...securitySettings, max_session_time_minutes: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login_attempts">Máx. tentativas de login</Label>
              <Input
                id="login_attempts"
                type="number"
                min="1"
                value={securitySettings.max_login_attempts}
                onChange={(e) => setSecuritySettings({...securitySettings, max_login_attempts: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lockout_duration">Tempo de bloqueio (minutos)</Label>
              <Input
                id="lockout_duration"
                type="number"
                min="1"
                value={securitySettings.lockout_duration_minutes}
                onChange={(e) => setSecuritySettings({...securitySettings, lockout_duration_minutes: parseInt(e.target.value)})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveGlobalSettings} disabled={saving} size="lg">
          {saving ? "Salvando..." : "Salvar Configurações Globais"}
        </Button>
      </div>
    </div>
  );
}
