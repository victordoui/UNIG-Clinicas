import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// VAPID public key - deve ser configurada no Supabase secrets
// Gerar com: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  isLoading: boolean;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
    isLoading: true,
  });
  const { user } = useAuth();
  const { toast } = useToast();

  // Verificar suporte e status atual
  const checkStatus = useCallback(async () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

    if (!supported) {
      setState({
        isSupported: false,
        isSubscribed: false,
        permission: 'default',
        isLoading: false,
      });
      return;
    }

    const permission = Notification.permission;
    let isSubscribed = false;

    // Verificar se há subscription ativa no banco
    if (user?.id) {
      const { data } = await supabase
        .from('user_push_tokens')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      isSubscribed = (data?.length ?? 0) > 0;
    }

    setState({
      isSupported: supported,
      isSubscribed,
      permission,
      isLoading: false,
    });
  }, [user?.id]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Solicitar permissão e inscrever
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !user?.id) {
      toast({
        title: 'Notificações não suportadas',
        description: 'Seu navegador não suporta notificações push.',
        variant: 'destructive',
      });
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // 1. Solicitar permissão
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));

      if (permission !== 'granted') {
        toast({
          title: 'Permissão negada',
          description: 'Você precisa permitir notificações para receber alertas.',
          variant: 'destructive',
        });
        return false;
      }

      // 2. Obter service worker registration
      const registration = await navigator.serviceWorker.ready;

      // 3. Verificar se já tem subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // 4. Criar nova subscription
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
      }

      // 5. Salvar subscription no Supabase
      const subscriptionJson = JSON.parse(JSON.stringify(subscription.toJSON()));
      
      // Check if token already exists for this user
      const { data: existingToken } = await supabase
        .from('user_push_tokens')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingToken) {
        // Update existing token
        const { error } = await supabase
          .from('user_push_tokens')
          .update({
            subscription: subscriptionJson,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('Erro ao atualizar token:', error);
          throw error;
        }
      } else {
        // Insert new token
        const { error } = await supabase
          .from('user_push_tokens')
          .insert([{
            user_id: user.id,
            subscription: subscriptionJson,
          }]);

        if (error) {
          console.error('Erro ao salvar token:', error);
          throw error;
        }
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        permission: 'granted',
        isLoading: false,
      }));

      toast({
        title: 'Notificações ativadas!',
        description: 'Você receberá alertas importantes mesmo quando o app estiver fechado.',
      });

      return true;
    } catch (error) {
      console.error('Erro ao ativar notificações:', error);
      toast({
        title: 'Erro ao ativar notificações',
        description: 'Não foi possível ativar as notificações push.',
        variant: 'destructive',
      });
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported, user?.id, toast]);

  // Cancelar inscrição
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // 1. Remover do banco
      const { error } = await supabase
        .from('user_push_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      // 2. Cancelar subscription no navegador
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      toast({
        title: 'Notificações desativadas',
        description: 'Você não receberá mais notificações push.',
      });

      return true;
    } catch (error) {
      console.error('Erro ao desativar notificações:', error);
      toast({
        title: 'Erro ao desativar',
        description: 'Não foi possível desativar as notificações.',
        variant: 'destructive',
      });
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user?.id, toast]);

  // Enviar notificação de teste
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          title: '🔔 Teste de Notificação',
          message: 'Suas notificações push estão funcionando corretamente!',
          data: { type: 'test' },
        },
      });

      if (error) throw error;

      toast({
        title: 'Notificação enviada!',
        description: 'Verifique se recebeu a notificação.',
      });

      return true;
    } catch (error) {
      console.error('Erro ao enviar teste:', error);
      toast({
        title: 'Erro no teste',
        description: 'Não foi possível enviar a notificação de teste.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user?.id, toast]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTestNotification,
    refresh: checkStatus,
  };
}
