import OneSignal from 'react-onesignal';
import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID = '2c42e82a-a1c6-4bf8-bb8b-67106cf7d92c';

export const initializeOneSignal = async () => {
  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
    });

    const isSubscribed = await OneSignal.Notifications.permission;
    
    if (isSubscribed !== true) {
      await OneSignal.Slidedown.promptPush();
    }

    const userId = OneSignal.User.onesignalId;
    
    if (userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Store user ID for future notifications
      }
    }
  } catch (error) {
    // OneSignal initialization failed silently
  }
};

export const sendTestNotification = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Send browser notification directly
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test push notification from UniMarket!',
        icon: '/logo.png',
        badge: '/logo.png'
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Test Notification', {
          body: 'This is a test push notification from UniMarket!',
          icon: '/logo.png',
          badge: '/logo.png'
        });
      }
    }

    // Also create in database
    await supabase.from('notifications').insert({
      user_id: user.id,
      title: 'Test Notification',
      message: 'This is a test push notification from UniMarket!',
      type: 'info'
    });

  } catch (error) {
    // Test notification failed silently
  }
};

export const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};