import { supabase } from '@/integrations/supabase/client';

export const logSecurityEvent = async (
  userId: string,
  eventType: string,
  description: string,
  additionalData?: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
  }
) => {
  try {
    await supabase.from('security_logs').insert({
      user_id: userId,
      event_type: eventType,
      description: description,
      ip_address: additionalData?.ipAddress,
      user_agent: additionalData?.userAgent || navigator.userAgent,
      location: additionalData?.location,
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};