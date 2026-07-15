import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from '@/lib/pushConfig';
import { useAuth } from '@/contexts/AuthContext';

export type PushPermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

/**
 * Registra service worker de push, expõe estado da permissão e permite
 * assinar/cancelar via edge function `register-push-subscription`.
 */
export function usePushSubscription() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  const supported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;

  const refresh = useCallback(async () => {
    if (!supported) { setPermission('unsupported'); return; }
    setPermission(Notification.permission as PushPermissionState);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/push-sw.js');
      const sub = await reg?.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch { setSubscribed(false); }
  }, [supported]);

  useEffect(() => { void refresh(); }, [refresh]);

  const enable = useCallback(async () => {
    if (!supported || !user) return { ok: false, reason: 'unsupported' as const };
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermissionState);
      if (perm !== 'granted') return { ok: false, reason: 'denied' as const };

      const reg = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const { error } = await supabase.functions.invoke('register-push-subscription', {
        body: { action: 'subscribe', subscription: sub.toJSON() },
      });
      if (error) throw error;

      setSubscribed(true);
      return { ok: true as const };
    } catch (e) {
      console.error('enable push failed', e);
      return { ok: false, reason: 'error' as const, error: e };
    } finally { setBusy(false); }
  }, [supported, user]);

  const disable = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/push-sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.functions.invoke('register-push-subscription', {
          body: { action: 'unsubscribe', endpoint: sub.endpoint },
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally { setBusy(false); }
  }, [supported]);

  return { supported, permission, subscribed, busy, enable, disable, refresh };
}
