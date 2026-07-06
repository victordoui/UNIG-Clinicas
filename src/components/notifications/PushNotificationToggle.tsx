import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, BellRing, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function PushNotificationToggle() {
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  const [isTesting, setIsTesting] = useState(false);

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    await sendTestNotification();
    setIsTesting(false);
  };

  // Renderizar status
  const renderStatus = () => {
    if (!isSupported) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Não suportado
        </Badge>
      );
    }

    if (permission === 'denied') {
      return (
        <Badge variant="destructive" className="gap-1">
          <BellOff className="h-3 w-3" />
          Bloqueado
        </Badge>
      );
    }

    if (isSubscribed) {
      return (
        <Badge variant="default" className="gap-1 bg-success text-success-foreground">
          <CheckCircle2 className="h-3 w-3" />
          Ativo
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="gap-1">
        <BellOff className="h-3 w-3" />
        Desativado
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Notificações Push</CardTitle>
              <CardDescription>
                Receba alertas mesmo quando o app estiver fechado
              </CardDescription>
            </div>
          </div>
          {renderStatus()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSupported ? (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Navegador não suportado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Seu navegador não suporta notificações push. Tente usar Chrome, Firefox, Edge ou Safari.
                </p>
              </div>
            </div>
          </div>
        ) : permission === 'denied' ? (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-3">
              <BellOff className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Permissão bloqueada</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Você bloqueou as notificações. Para reativar, clique no ícone de cadeado na barra de
                  endereço e permita notificações.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                {isSubscribed ? (
                  <BellRing className="h-5 w-5 text-success" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {isSubscribed ? 'Notificações ativas' : 'Ativar notificações'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isSubscribed
                      ? 'Você receberá alertas de estoque baixo e movimentações'
                      : 'Clique para ativar alertas em tempo real'}
                  </p>
                </div>
              </div>
              <Switch
                checked={isSubscribed}
                onCheckedChange={handleToggle}
                disabled={isLoading}
              />
            </div>

            {isSubscribed && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Verifique se está recebendo notificações corretamente
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  disabled={isTesting}
                  className="gap-2"
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  {isTesting ? 'Enviando...' : 'Testar'}
                </Button>
              </div>
            )}

            {/* Tipos de alertas */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">Você receberá alertas para:</p>
              <div className="space-y-2">
                {[
                  { icon: '📦', label: 'Estoque crítico ou zerado' },
                  { icon: '↗️', label: 'Novas entradas de produtos' },
                  { icon: '↙️', label: 'Saídas significativas' },
                  { icon: '⚠️', label: 'Alertas do sistema' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
