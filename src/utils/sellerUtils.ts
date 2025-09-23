import { supabase } from '@/integrations/supabase/client';

export const upgradeToSeller = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.rpc('upgrade_to_seller');
    
    if (error) {
      console.error('Error upgrading to seller:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in upgradeToSeller:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};