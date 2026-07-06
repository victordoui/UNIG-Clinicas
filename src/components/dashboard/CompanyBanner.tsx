import { useState, useEffect } from "react";
import { Building, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface CompanySettings {
  company_name: string;
  company_cnpj: string;
  company_logo: string;
}

export function CompanyBanner() {
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: "",
    company_cnpj: "",
    company_logo: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .in('setting_key', ['company_name', 'company_cnpj', 'company_logo']);

      if (data && data.length > 0) {
        const settingsObj: any = {};
        data.forEach(setting => {
          settingsObj[setting.setting_key] = setting.setting_value;
        });
        setSettings(prev => ({ ...prev, ...settingsObj }));
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-full border-0 shadow-none bg-transparent">
        <CardContent className="p-6 h-full flex items-center gap-4">
          <div className="animate-pulse flex items-center gap-4 w-full">
            <div className="w-14 h-14 bg-primary/10 rounded-xl"></div>
            <div className="flex-1">
              <div className="h-4 bg-primary/10 rounded-lg w-24 mb-2"></div>
              <div className="h-3 bg-primary/5 rounded-lg w-32"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-0 shadow-none bg-transparent">
      <CardContent className="p-6 h-full flex items-center gap-4">
        {/* Logo da empresa */}
        <div className="flex-shrink-0">
          {settings.company_logo ? (
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-background border-2 border-primary/20 shadow-lg">
              <img 
                src={settings.company_logo} 
                alt="Logo da empresa"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 flex items-center justify-center shadow-lg">
              <Building className="h-7 w-7 text-primary" />
            </div>
          )}
        </div>

        {/* Informações da empresa */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-lg leading-tight mb-1">
            {settings.company_name || "Nome da Empresa"}
          </h3>
          <p className="text-sm text-muted-foreground font-medium">
            {settings.company_cnpj ? `CNPJ: ${settings.company_cnpj}` : "Configure nas configurações"}
          </p>
        </div>

        {/* Indicador configurável */}
        {!settings.company_name && !settings.company_cnpj && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-4 w-4 text-primary" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}