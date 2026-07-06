import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listener para evento de instalação (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Verificar se usuário já recusou antes
      const hasDeclined = localStorage.getItem('pwa-install-declined');
      if (!hasDeclined) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Mostrar prompt para iOS após 10 segundos se não instalado
    if (ios && !isInstalled) {
      const timer = setTimeout(() => {
        const hasDeclined = localStorage.getItem('pwa-install-declined-ios');
        if (!hasDeclined) {
          setShowPrompt(true);
        }
      }, 10000);
      
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(timer);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt && !isIOS) return;

    if (deferredPrompt) {
      // Android/Chrome
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem(isIOS ? 'pwa-install-declined-ios' : 'pwa-install-declined', 'true');
    // Limpar depois de 7 dias
    setTimeout(() => {
      localStorage.removeItem(isIOS ? 'pwa-install-declined-ios' : 'pwa-install-declined');
    }, 7 * 24 * 60 * 60 * 1000);
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4">
      <Card className="p-4 shadow-2xl border-2 border-primary/20 bg-card">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">
              Instalar UNIG Facilities
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {isIOS 
                ? 'Adicione à tela inicial para acesso rápido e experiência nativa!'
                : 'Instale nosso app para acesso rápido e uso offline!'
              }
            </p>
            
            {isIOS ? (
              <div className="bg-muted/50 p-3 rounded-lg mb-3 text-xs space-y-1">
                <p className="font-medium">Como instalar no iOS:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Toque no ícone de compartilhar <span className="inline-block">⬆️</span></li>
                  <li>Role até "Adicionar à Tela de Início"</li>
                  <li>Toque em "Adicionar"</li>
                </ol>
              </div>
            ) : null}
            
            <div className="flex gap-2">
              {!isIOS && (
                <Button 
                  size="sm" 
                  onClick={handleInstallClick}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Instalar
                </Button>
              )}
            </div>
          </div>
          
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8" 
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}