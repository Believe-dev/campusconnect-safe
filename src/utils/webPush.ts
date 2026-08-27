import { supabase } from '@/integrations/supabase/client';

// Public VAPID keys are designed to be embedded in frontend code (same
// treatment this repo already gives its Supabase anon key) — only the
// private half is a secret, held server-side as an Edge Function secret.
const VAPID_PUBLIC_KEY =
  'BNrkvOsLaYo09-0LCYx6o8OQntyu07_hBlvkdwIjxlKdZ8yWt67s3whUpatnVGOrT-fruhF84GwDpB6g4w68zoM';

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Requests notification permission, subscribes this device to Web Push via
 * the browser's own PushManager (no third-party SDK), and saves the
 * subscription so the server can deliver to it. Safe to call multiple
 * times — re-subscribing the same device upserts on `endpoint`.
 */
export const subscribeToPush = async (): Promise<boolean> => {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

    if (permission !== 'granted') {
      return false;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    const { endpoint, keys } = subscription.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error('Failed to save push subscription:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return false;
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
    }
    return false;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const sendBrowserNotification = async (
  title: string,
  message: string,
  options?: NotificationOptions
) => {
  try {
    if (!('Notification' in window)) return null;

    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') return null;

    const notification = new Notification(title, {
      body: message,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: 'unimarket-notification',
      requireInteraction: false,
      silent: false,
      ...options,
    });

    setTimeout(() => {
      try {
        notification.close();
      } catch {
        // Ignore close errors
      }
    }, 5000);

    return notification;
  } catch (error) {
    console.error('Error sending browser notification:', error);
    throw error;
  }
};

export const sendMobileBrowserNotification = async (
  title: string,
  message: string,
  options?: NotificationOptions
) => {
  try {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    const notification = new Notification(title, {
      body: message,
      icon: '/logo.png',
      tag: 'unimarket-mobile',
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200],
      ...options,
    } as NotificationOptions);

    setTimeout(() => {
      try {
        notification.close();
      } catch {
        // Mobile browsers sometimes throw errors when closing notifications
      }
    }, 4000);

    return notification;
  } catch (error) {
    console.error('Error sending mobile browser notification:', error);
    throw error;
  }
};

export const setupNotificationClickHandler = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        const { url } = event.data;
        if (url) {
          window.open(url, '_blank');
        } else {
          window.focus();
          window.location.href = '/notifications';
        }
      }
    });
  }
};
