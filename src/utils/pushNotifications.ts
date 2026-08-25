import { supabase } from '@/integrations/supabase/client';

interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

// Register service worker and get push subscription
export const initializePushNotifications = async (): Promise<PushSubscription | null> => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Get or create push subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Skip push subscription on localhost
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('Push subscription skipped on localhost');
        return null;
      }
      
      // Use a valid VAPID key or skip if not available
      const vapidPublicKey = 'BMqSvZTDRuXkBCSQBXNe_wEBkBKnXGWxjqBUTnBqDHoqRrk8dTqXkBCSQBXNe_wEBkBKnXGWxjqBUTnBqDHoqRrk8dT';
      
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      } catch (error) {
        console.warn('Push subscription failed:', error);
        return null;
      }
    }

    // Store subscription in database
    const { data: { user } } = await supabase.auth.getUser();
    if (user && subscription) {
      await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          subscription: JSON.stringify(subscription),
          endpoint: subscription.endpoint,
          updated_at: new Date().toISOString()
        });
    }

    return subscription;
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return null;
  }
};

// Send push notification via service worker
export const sendPushNotification = async (data: PushNotificationData): Promise<boolean> => {
  try {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Show notification via service worker
    await registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/logo.png',
      badge: data.badge || '/logo.png',
      tag: data.tag || 'unimarket-notification',
      data: data.data || {},
      actions: data.actions || [
        {
          action: 'open',
          title: 'Open',
          icon: '/logo.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      vibrate: data.vibrate || [200, 100, 200],
      timestamp: Date.now()
    });

    return true;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
};

// Send notification to server for push delivery
export const sendServerPushNotification = async (
  userId: string,
  title: string,
  message: string,
  data?: any
): Promise<boolean> => {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: userId,
        title,
        message,
        data: data || {}
      }
    });

    if (error) {
      console.error('Server push notification failed:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send server push notification:', error);
    return false;
  }
};

// Test push notification
export const testPushNotification = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // First try local push notification
    const localSuccess = await sendPushNotification({
      title: 'UniMarket Test 📱',
      body: 'This is a test push notification! If you see this in your phone\'s notification panel, push notifications are working.',
      tag: 'test-notification',
      data: { type: 'test', url: '/notifications' }
    });

    // Also try server push notification
    const serverSuccess = await sendServerPushNotification(
      user.id,
      'UniMarket Server Test 🔔',
      'This is a server-side push notification test.',
      { type: 'server-test', url: '/notifications' }
    );

    return localSuccess || serverSuccess;
  } catch (error) {
    console.error('Push notification test failed:', error);
    return false;
  }
};

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
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

// Check if push notifications are supported and enabled
export const isPushNotificationSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

// Get current notification permission status
export const getNotificationPermission = (): NotificationPermission => {
  return Notification.permission;
};