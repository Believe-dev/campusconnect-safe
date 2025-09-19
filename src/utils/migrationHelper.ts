import { supabase } from '@/integrations/supabase/client';

export const checkAndAddIsReadColumn = async () => {
  try {
    // Try to query the is_read column to see if it exists
    const { error } = await supabase
      .from('messages')
      .select('is_read')
      .limit(1);

    if (error && (error.message?.includes('is_read') || error.code === '42703')) {
      console.log('is_read column does not exist');
      return false;
    }

    console.log('is_read column exists');
    return true;
  } catch (error) {
    console.error('Error checking is_read column:', error);
    return false;
  }
};