import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePwaUpdate } from '@/pwa/registerSW';

export function UpdateBanner() {
  const { needRefresh, updating, update, dismiss } = usePwaUpdate();

  if (updating) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-xl"
      >
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
        <p className="text-sm font-medium">Atualizando o sistema… o painel continua disponível.</p>
      </div>
    );
  }

  if (!needRefresh) return null;

  return (
    <div
      role="alert"
      className="fixed z-[90] bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:right-4 md:translate-x-0 w-[calc(100%-2rem)] max-w-md rounded-lg border bg-card text-card-foreground shadow-lg p-4 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
          <RefreshCw className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Nova versão disponível</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Atualize para receber as últimas melhorias do sistema.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={update}>Atualizar agora</Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>Depois</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
