import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export function usePWAUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefreshState, setNeedRefreshState],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('✅ Service Worker registrado:', registration);
      
      // Verificar atualizações a cada hora
      setInterval(() => {
        registration?.update();
      }, 60 * 60 * 1000);
    },
    onRegisterError(error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast.success('App pronto para uso offline! 🎉', {
        description: 'Você pode usar o UNIG Facilities mesmo sem internet',
        duration: 5000,
      });
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (needRefreshState) {
      setNeedRefresh(true);
      
      toast.info(
        'Nova versão disponível! 🚀',
        {
          description: 'Uma atualização do UNIG Facilities está pronta para instalar',
          duration: Infinity,
          action: {
            label: 'Atualizar',
            onClick: () => {
              updateServiceWorker(true);
              setNeedRefreshState(false);
              setNeedRefresh(false);
            },
          },
        }
      );
    }
  }, [needRefreshState, setNeedRefreshState, updateServiceWorker]);

  return { needRefresh, updateServiceWorker };
}