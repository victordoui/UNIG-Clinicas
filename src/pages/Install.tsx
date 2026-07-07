import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Smartphone, Zap, WifiOff, Bell } from 'lucide-react';
import unigLogo from '@/assets/uniga-logo.png';

export default function Install() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-white border flex items-center justify-center p-2 shadow-sm">
            <img src={unigLogo} alt="UNIG-A" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold">Instale o UNIG-A</h1>
          <p className="text-muted-foreground">Tenha acesso rápido ao Portal Acadêmico direto da tela inicial do seu dispositivo.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-4 border-primary/20">
            <WifiOff className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Modo Offline</h3>
            <p className="text-sm text-muted-foreground">Acesso a partes do sistema mesmo sem internet.</p>
          </Card>
          <Card className="p-4 border-primary/20">
            <Zap className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Super Rápido</h3>
            <p className="text-sm text-muted-foreground">Abertura instantânea, sem passar pelo navegador.</p>
          </Card>
          <Card className="p-4 border-primary/20">
            <Bell className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Notificações</h3>
            <p className="text-sm text-muted-foreground">Receba avisos e comunicados institucionais.</p>
          </Card>
          <Card className="p-4 border-primary/20">
            <Smartphone className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Experiência Mobile</h3>
            <p className="text-sm text-muted-foreground">Portal do Aluno otimizado para celular.</p>
          </Card>
        </div>

        <div className="text-center">
          <Button asChild size="lg"><a href="/">Ir para o sistema</a></Button>
        </div>
      </Card>
    </div>
  );
}
