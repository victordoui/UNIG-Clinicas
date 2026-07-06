import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Smartphone, CheckCircle, Zap, WifiOff, Bell } from 'lucide-react';
import vstockLogo from '@/assets/unig-facilities-logo-v2.png';

export default function Install() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 space-y-6">
        <div className="text-center space-y-4">
          <img src={vstockLogo} alt="UNIG Facilities" className="h-20 mx-auto" />
          <h1 className="text-3xl font-bold">Instale o UNIG Facilities</h1>
          <p className="text-muted-foreground">
            Tenha acesso rápido ao sistema direto da tela inicial do seu dispositivo
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-4 border-primary/20">
            <WifiOff className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Modo Offline</h3>
            <p className="text-sm text-muted-foreground">
              Acesse dados mesmo sem internet
            </p>
          </Card>
          
          <Card className="p-4 border-primary/20">
            <Zap className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Super Rápido</h3>
            <p className="text-sm text-muted-foreground">
              Carregamento instantâneo
            </p>
          </Card>
          
          <Card className="p-4 border-primary/20">
            <Bell className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Notificações</h3>
            <p className="text-sm text-muted-foreground">
              Alertas em tempo real
            </p>
          </Card>
          
          <Card className="p-4 border-primary/20">
            <Smartphone className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Experiência Nativa</h3>
            <p className="text-sm text-muted-foreground">
              Interface otimizada para mobile
            </p>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-center">Como instalar?</h2>
          
          {/* Android */}
          <Card className="p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              📱 Android (Chrome)
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Toque no menu (⋮) do navegador</li>
              <li>Selecione "Instalar app" ou "Adicionar à tela inicial"</li>
              <li>Confirme a instalação</li>
            </ol>
          </Card>

          {/* iOS */}
          <Card className="p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              🍎 iOS (Safari)
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Toque no ícone de compartilhar (⬆️)</li>
              <li>Role até "Adicionar à Tela de Início"</li>
              <li>Toque em "Adicionar"</li>
            </ol>
          </Card>
        </div>

        <div className="text-center">
          <Button size="lg" className="w-full md:w-auto" asChild>
            <a href="/dashboard">
              <CheckCircle className="mr-2 h-5 w-5" />
              Já instalei, ir para o app
            </a>
          </Button>
        </div>
      </Card>
    </div>
  );
}