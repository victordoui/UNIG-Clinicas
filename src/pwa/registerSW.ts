import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function shouldRegisterSW(): boolean {
  if (!import.meta.env.PROD) return false;
  if (typeof window === 'undefined') return false;
  try {
    if (window.top !== window.self) return false;
  } catch {
    return false;
  }
  const { hostname, search } = window.location;
  if (search.includes('sw=off')) return false;
  if (hostname.startsWith('id-preview--') || hostname.startsWith('preview--')) return false;
  const blocked = [
    'lovableproject.com',
    'lovableproject-dev.com',
    'beta.lovable.dev',
  ];
  if (blocked.some((h) => hostname === h || hostname.endsWith('.' + h))) return false;
  return true;
}

async function unregisterAll() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* noop */
  }
}

export function usePwaUpdate() {
  const allowed = shouldRegisterSW();
  const [updating, setUpdating] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: allowed,
    onRegisterError(err) {
      // eslint-disable-next-line no-console
      console.warn('[pwa] register error', err);
    },
  });

  useEffect(() => {
    if (!allowed) {
      unregisterAll();
    }
  }, [allowed]);

  const update = async () => {
    setUpdating(true);
    try {
      await updateServiceWorker(true);
    } catch {
      setUpdating(false);
    }
  };

  const dismiss = () => setNeedRefresh(false);

  return {
    needRefresh: allowed && needRefresh,
    updating,
    update,
    dismiss,
  };
}
