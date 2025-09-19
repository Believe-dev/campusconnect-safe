import { supabase } from '@/integrations/supabase/client';

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string = 'info',
  actionUrl?: string
) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        action_url: actionUrl,
        is_read: false
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};

export const notifyVerificationRemoved = async (userId: string) => {
  return createNotification(
    userId,
    'Verification Badge Removed ⚠️',
    'Your seller verification badge has been removed. Please contact support if you believe this is an error.',
    'warning',
    '/profile'
  );
};

export const notifyNewMessage = async (userId: string, senderName: string) => {
  return createNotification(
    userId,
    'New Message 💬',
    `You have a new message from ${senderName}`,
    'info',
    '/messages'
  );
};