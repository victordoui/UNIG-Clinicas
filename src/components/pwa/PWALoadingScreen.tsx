import { useEffect, useState } from 'react';
import { useTheme } from '@/components/ui/theme-provider';
import { cn } from '@/lib/utils';
import appIcon from '@/assets/app-icon.png';

export function PWALoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const { theme } = useTheme();
  
  // Detectar se é primeira carga ou PWA standalone
  const isPWA = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    new URLSearchParams(window.location.search).get('source') === 'pwa';
  
  // Detectar tema efetivo (system -> dark/light)
  const effectiveTheme = theme === 'system' 
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : theme;

  useEffect(() => {
    // Nunca exibir o splash em rotas de impressão — o navegador abre o diálogo
    // de print antes do conteúdo aparecer.
    if (typeof window !== 'undefined' && window.location.pathname.includes('/imprimir')) {
      setIsLoading(false);
      return;
    }

    // Só mostrar se for PWA ou primeira carga
    const hasLoadedBefore = sessionStorage.getItem('pwa-loaded');
    
    if (!isPWA && hasLoadedBefore) {
      setIsLoading(false);
      return;
    }

    sessionStorage.setItem('pwa-loaded', 'true');

    // Simular carregamento
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsLoading(false), 500); // Fade out após completar
          return 100;
        }
        return prev + 10;
      });
    }, 150); // 1.5s total

    return () => clearInterval(interval);
  }, [isPWA]);

  if (!isLoading) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[9999]",
        "bg-background",
        "flex flex-col items-center justify-center",
        "transition-opacity duration-500",
        !isLoading ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      {/* Glow effect */}
      <div className="relative mb-12">
        <div className="absolute inset-0 -m-8 animate-glow-pulse">
          <div className="w-48 h-48 rounded-full bg-primary/20 blur-3xl" />
        </div>
        
        {/* Ícone do app */}
        <img 
          src={appIcon}
          alt="UNIG Facilities"
          className="relative w-32 h-32 object-contain animate-pulse-slow transition-all duration-300"
        />
      </div>

      {/* Barra de progresso */}
      <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Texto de carregamento */}
      <p className="text-sm text-muted-foreground mt-4 animate-pulse">
        Carregando sistema...
      </p>
    </div>
  );
}
