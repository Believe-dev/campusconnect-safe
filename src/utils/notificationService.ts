import { supabase } from '@/integrations/supabase/client';

interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  url?: string;
  data?: Record<string, any>;
}

export const sendNotification = async ({
  userId,
  title,
  message,
  type = 'info',
  url = '/notifications',
  data = {}
}: NotificationData): Promise<boolean> => {
  try {
    // Insert into database (this will trigger the push notification via database trigger)
    const { error: dbError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type
      });

    if (dbError) {
      console.error('Database notification error:', dbError);
      return false;
    }

    // Also send push notification directly as backup
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: userId,
          title,
          message,
          data: {
            type,
            url,
            ...data
          }
        }
      });
    } catch (pushError) {
      console.error('Push notification error:', pushError);
      // Don't fail if push notification fails
    }

    return true;
  } catch (error) {
    console.error('Notification service error:', error);
    return false;
  }
};

// Specific notification types
export const sendOrderNotification = (userId: string, title: string, message: string, orderId?: string) =>
  sendNotification({
    userId,
    title,
    message,
    type: 'info',
    url: '/orders',
    data: { orderId }
  });

export const sendPaymentNotification = (userId: string, title: string, message: string, amount?: number) =>
  sendNotification({
    userId,
    title,
    message,
    type: 'success',
    url: '/wallet',
    data: { amount }
  });

export const sendDisputeNotification = (userId: string, title: string, message: string, disputeId?: string) =>
  sendNotification({
    userId,
    title,
    message,
    type: 'warning',
    url: '/disputes',
    data: { disputeId }
  });

export const sendMessageNotification = (userId: string, title: string, message: string, chatId?: string) =>
  sendNotification({
    userId,
    title,
    message,
    type: 'info',
    url: '/messages',
    data: { chatId }
  });