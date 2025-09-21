import OneSignal from 'react-onesignal';
import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID = '2c42e82a-a1c6-4bf8-bb8b-67106cf7d92c';

export const initializeOneSignal = async () => {
  try {
    console.log('Initializing OneSignal...');
    
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
    });

    console.log('OneSignal initialized, requesting permission...');
    
    // Check if already subscribed
    const isSubscribed = await OneSignal.isPushNotificationsEnabled();
    console.log('Push notifications enabled:', isSubscribed);
    
    if (!isSubscribed) {
      // Request permission
      await OneSignal.showSlidedownPrompt();
    }

    // Get player ID and save to database
    const playerId = await OneSignal.getPlayerId();
    console.log('Player ID:', playerId);
    
    if (playerId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ onesignal_player_id: playerId })
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Failed to save player ID:', error);
        } else {
          console.log('Player ID saved to database');
        }
      }
    }

    console.log('OneSignal setup complete');
  } catch (error) {
    console.error('OneSignal initialization failed:', error);
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

    console.log('Test notification sent');
  } catch (error) {
    console.error('Failed to send test notification:', error);
  }
};

export const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission === 'granted';
  }
  return false;
};