import OneSignal from 'react-onesignal';
import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID = '2c42e82a-a1c6-4bf8-bb8b-67106cf7d92c';

export const initializeOneSignal = async () => {
  try {
    // Skip OneSignal on localhost to avoid domain errors
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('OneSignal skipped on localhost');
      return;
    }
    
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: '/sw.js',
      serviceWorkerUpdaterPath: '/sw.js',
      notifyButton: {
        enable: false
      }
    });

    // Request permission
    const permission = await OneSignal.Notifications.requestPermission();
    console.log('OneSignal permission:', permission);
    
    // Set external user ID for targeted notifications
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await OneSignal.login(user.id);
      await OneSignal.User.addTag('user_type', 'authenticated');
      
      // Get player ID and store it
      const playerId = await OneSignal.User.PushSubscription.id;
      if (playerId) {
        await supabase
          .from('profiles')
          .update({ onesignal_player_id: playerId })
          .eq('id', user.id);
      }
    }
    
    console.log('OneSignal initialized successfully');
    return true;
  } catch (error) {
    console.error('OneSignal initialization failed:', error);
  }
};

export const sendTestNotification = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Create database notification first
    const { error: dbError } = await supabase.from('notifications').insert({
      user_id: user.id,
      title: `Test Notification ${isMobile ? '📱' : '🗏'}`,
      message: `This is a test notification from UniMarket! ${isMobile ? 'Mobile' : 'Desktop'} notifications are working correctly.`,
      type: 'info'
    });
    
    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Send push notification via server (skip on localhost)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      try {
        const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: user.id,
            title: `UniMarket Test ${isMobile ? '📱' : '🗏'}`,
            message: 'This test notification should appear in your phone\'s notification panel!',
            data: { type: 'test', url: '/notifications' }
          }
        });
        
        if (pushError) {
          console.warn('Server push notification failed:', pushError);
        }
      } catch (pushError) {
        console.warn('Push notification error:', pushError);
      }
    }

    // Fallback browser notification
    if (isMobile) {
      await sendMobileBrowserNotification(
        'UniMarket Mobile Test 📱',
        'Mobile test notification successful!'
      );
    } else {
      await sendBrowserNotification(
        'UniMarket Test 🗏',
        'This is a test notification from UniMarket! All systems are working correctly.'
      );
    }
    
    // Trigger notification count update
    window.dispatchEvent(new CustomEvent('notificationsUpdated'));
    
    return true;
  } catch (error) {
    console.error('Test notification failed:', error);
    throw error;
  }
};

export const sendBrowserNotification = async (title: string, message: string, options?: any) => {
  try {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body: message,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: 'unimarket-notification',
          requireInteraction: false,
          silent: false,
          ...options
        });
        
        setTimeout(() => {
          try {
            notification.close();
          } catch (e) {
            // Ignore close errors
          }
        }, 5000);
        
        return notification;
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const notification = new Notification(title, {
            body: message,
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'unimarket-notification',
            requireInteraction: false,
            silent: false,
            ...options
          });
          
          setTimeout(() => {
            try {
              notification.close();
            } catch (e) {
              // Ignore close errors
            }
          }, 5000);
          return notification;
        }
      }
    }
  } catch (error) {
    console.error('Error sending browser notification:', error);
    throw error;
  }
  return null;
};

export const sendMobileBrowserNotification = async (title: string, message: string, options?: any) => {
  try {
    if ('Notification' in window) {
      let permission = Notification.permission;
      
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      
      if (permission === 'granted') {
        const notification = new Notification(title, {
          body: message,
          icon: '/logo.png',
          tag: 'unimarket-mobile',
          requireInteraction: false,
          silent: false,
          vibrate: [200, 100, 200],
          ...options
        });
        
        setTimeout(() => {
          try {
            notification.close();
          } catch (e) {
            // Mobile browsers sometimes throw errors when closing notifications
          }
        }, 4000);
        
        return notification;
      } else {
        throw new Error('Notification permission not granted');
      }
    } else {
      throw new Error('Notifications not supported');
    }
  } catch (error) {
    console.error('Error sending mobile browser notification:', error);
    throw error;
  }
};

export const requestNotificationPermission = async () => {
  try {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        return true;
      }
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

export const setupNotificationClickHandler = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        // Handle notification click
        const { url } = event.data;
        if (url) {
          window.open(url, '_blank');
        } else {
          window.focus();
          // Navigate to notifications page
          window.location.href = '/notifications';
        }
      }
    });
  }
};

// Enhanced notification functions
export const notifyOrderUpdate = async (userId: string, orderId: string, status: string) => {
  const titles = {
    'shipped': 'Order Shipped! 📦',
    'delivered': 'Order Delivered! ✅',
    'cancelled': 'Order Cancelled ❌',
    'refunded': 'Order Refunded 💰'
  };
  
  const messages = {
    'shipped': `Your order #${orderId} has been shipped and is on its way to you.`,
    'delivered': `Your order #${orderId} has been delivered. Please confirm receipt.`,
    'cancelled': `Your order #${orderId} has been cancelled.`,
    'refunded': `Your order #${orderId} has been refunded. The amount will be credited to your wallet.`
  };
  
  try {
    await supabase.rpc('notify_user', {
      target_user_id: userId,
      notification_title: titles[status] || 'Order Update',
      notification_message: messages[status] || `Your order #${orderId} status has been updated.`,
      notification_type: status === 'cancelled' ? 'warning' : 'info',
      send_push: true,
      send_email: true
    });
  } catch (error) {
    console.error('Error sending order notification:', error);
  }
};

export const notifyNewMessage = async (userId: string, senderName: string, preview: string) => {
  try {
    await supabase.rpc('notify_user', {
      target_user_id: userId,
      notification_title: `New message from ${senderName} 💬`,
      notification_message: preview.length > 100 ? preview.substring(0, 100) + '...' : preview,
      notification_type: 'info',
      send_push: true,
      send_email: false // Don't send email for messages to avoid spam
    });
  } catch (error) {
    console.error('Error sending message notification:', error);
  }
};

export const notifyPaymentUpdate = async (userId: string, amount: number, type: 'received' | 'sent' | 'refund') => {
  const titles = {
    'received': 'Payment Received! 💰',
    'sent': 'Payment Sent 💸',
    'refund': 'Refund Processed 🔄'
  };
  
  const messages = {
    'received': `You have received ₦${amount.toLocaleString()} in your wallet.`,
    'sent': `You have sent ₦${amount.toLocaleString()} from your wallet.`,
    'refund': `A refund of ₦${amount.toLocaleString()} has been processed to your wallet.`
  };
  
  try {
    await supabase.rpc('notify_user', {
      target_user_id: userId,
      notification_title: titles[type],
      notification_message: messages[type],
      notification_type: 'success',
      send_push: true,
      send_email: true
    });
  } catch (error) {
    console.error('Error sending payment notification:', error);
  }
};