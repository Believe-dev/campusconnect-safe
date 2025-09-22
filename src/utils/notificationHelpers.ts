import { supabase } from '@/integrations/supabase/client';

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string = 'info'
) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
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
    'warning'
  );
};

