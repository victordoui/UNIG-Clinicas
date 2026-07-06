import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Settings, Building2, Palette, Bell, PiggyBank, Landmark, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ui/theme-provider";
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";
import { BudgetsSection } from "@/components/purchases/BudgetsSection";
import { BankAccountsSection } from "@/components/financial/BankAccountsSection";
import { useAuth } from "@/hooks/useAuth";

interface SettingsData {
  company_name: string;
  contact_email: string;
  currency: string;
  timezone: string;
  notifications_enabled: boolean;
}

type ThemeValue = "light" | "dark" | "system";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
}

export default function ConfiguracoesGerais() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    company_name: "UNIG Facilities",
    contact_email: "",
    currency: "BRL",
    timezone: "America/Sao_Paulo",
    notifications_enabled: true,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("*").limit(1);
      if (data && data.length > 0) {
        const v = data[0].setting_value as unknown as SettingsData;
        if (v) setSettings((prev) => ({ ...prev, ...v }));
      }
    })();
  }, []);

  const saveSettings = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("settings")
        .upsert({ setting_key: "general_settings", setting_value: settings as unknown as Json } as never);
      if (error) throw error;
      toast({ title: "Configurações salvas com sucesso" });
    } catch (e: unknown) {
      toast({ title: "Erro ao salvar", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const subscriptionPlan = (organization as { subscription_plan?: string | null } | null | undefined)?.subscription_plan ?? "-";

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Configurações Gerais
          </h1>
          <p className="text-muted-foreground mt-1">
            Configurações da organização, aparência, notificações e financeiro.
          </p>
        </div>

        <Tabs defaultValue="geral">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="geral"><Settings className="h-4 w-4 mr-1.5" />Geral</TabsTrigger>
            <TabsTrigger value="empresa"><Building2 className="h-4 w-4 mr-1.5" />Empresa</TabsTrigger>
            <TabsTrigger value="aparencia"><Palette className="h-4 w-4 mr-1.5" />Aparência</TabsTrigger>
            <TabsTrigger value="notificacoes"><Bell className="h-4 w-4 mr-1.5" />Notificações</TabsTrigger>
            <TabsTrigger value="centros-custo"><Landmark className="h-4 w-4 mr-1.5" />Centros de Custo</TabsTrigger>
            <TabsTrigger value="orcamentos"><PiggyBank className="h-4 w-4 mr-1.5" />Orçamentos</TabsTrigger>
            <TabsTrigger value="contas"><Wallet className="h-4 w-4 mr-1.5" />Contas Bancárias</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Configurações Gerais</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome da Empresa</Label>
                    <Input value={settings.company_name} onChange={(e) => setSettings((p) => ({ ...p, company_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Email de Contato</Label>
                    <Input type="email" value={settings.contact_email} onChange={(e) => setSettings((p) => ({ ...p, contact_email: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Moeda</Label>
                    <Select value={settings.currency} onValueChange={(v) => setSettings((p) => ({ ...p, currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">Real (BRL)</SelectItem>
                        <SelectItem value="USD">Dólar (USD)</SelectItem>
                        <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fuso Horário</Label>
                    <Select value={settings.timezone} onValueChange={(v) => setSettings((p) => ({ ...p, timezone: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                        <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
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

          <TabsContent value="empresa" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Dados da Organização</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome</Label>
                    <Input value={organization?.organization_name ?? ""} disabled />
                  </div>
                  <div>
                    <Label>Plano</Label>
                    <Input value={subscriptionPlan} disabled />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Para alterar dados cadastrais da organização (CNPJ, endereço, contatos), use o módulo de Organizações.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aparencia" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />Aparência</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-2 block">Tema</Label>
                  <Select value={theme} onValueChange={(v) => setTheme(v as ThemeValue)}>
                    <SelectTrigger className="w-full md:w-72"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Escuro</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notificacoes" className="mt-4">
            <PushNotificationToggle />
          </TabsContent>

          <TabsContent value="centros-custo" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  Setores / Centro de Custo
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-sm text-muted-foreground max-w-2xl">
                  O cadastro de centros de custo foi centralizado em Administração para suportar importação, exportação,
                  vínculos com usuários, unidades e classificações.
                </p>
                <Link to="/admin/setores-centro-custo">
                  <Button>
                    Abrir cadastro central
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orcamentos" className="mt-4">
            <BudgetsSection />
          </TabsContent>

          <TabsContent value="contas" className="mt-4">
            <BankAccountsSection />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
