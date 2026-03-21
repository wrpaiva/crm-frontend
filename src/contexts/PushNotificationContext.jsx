import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getVapidPublicKey, subscribe, unsubscribe } from '../services/push.service';
import { useToast } from '../hooks/useToast';

const PushNotificationContext = createContext(null);

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushNotificationProvider({ children }) {
  const toast = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState(null);

  const isVapidSupported =
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  // Fetch public key once
  useEffect(() => {
    if (!isVapidSupported) return;
    getVapidPublicKey()
      .then((res) => setVapidPublicKey(res.data.publicKey))
      .catch(() => {});
  }, [isVapidSupported]);

  // Initialize isSubscribed from real browser subscription state
  useEffect(() => {
    if (!isVapidSupported) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => { if (sub) setIsSubscribed(true); })
      .catch(() => {});
  }, [isVapidSupported]);

  const subscribeToPush = useCallback(async () => {
    if (!isVapidSupported || !vapidPublicKey) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      const { endpoint, keys } = sub.toJSON();
      await subscribe({ endpoint, keys, userAgent: navigator.userAgent });
      setIsSubscribed(true);
    } catch (err) {
      console.error('Push subscribe error:', err);
      toast.error('Não foi possível ativar notificações push nativas.');
    }
  }, [isVapidSupported, vapidPublicKey, toast]);

  // Auto-subscribe when push is enabled in localStorage
  useEffect(() => {
    if (!isVapidSupported || !vapidPublicKey) return;
    const enabled = localStorage.getItem('crm_push_enabled') === 'true';
    const granted = Notification.permission === 'granted';
    if (enabled && granted) {
      subscribeToPush().catch(() => {});
    }
  }, [isVapidSupported, vapidPublicKey, subscribeToPush]);

  const unsubscribeFromPush = useCallback(async () => {
    if (!isVapidSupported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await unsubscribe(sub.endpoint);
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      toast.error('Não foi possível desativar notificações push nativas.');
    }
  }, [isVapidSupported, toast]);

  return (
    <PushNotificationContext.Provider
      value={{ isVapidSupported, isSubscribed, subscribeToPush, unsubscribeFromPush }}
    >
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotification() {
  return useContext(PushNotificationContext);
}
