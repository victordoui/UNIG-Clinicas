import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { Settings } from 'lucide-react';

export default function AdminConfiguracoes() {
  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Configurações Gerais</h1>
            <p className="text-sm text-muted-foreground">Chaves e valores de configuração do sistema (JSON).</p>
          </div>
        </div>
        <SettingsForm />
      </div>
    </MainLayout>
  );
}
