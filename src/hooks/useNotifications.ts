import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
        
        // If notifications table doesn't exist, silently fail
        if (error && (error.message?.includes('relation') || error.message?.includes('does not exist'))) {
          setUnreadCount(0);
          return;
        }
        
        if (error) throw error;
        setUnreadCount(count || 0);
      } catch (error) {
        // Silently handle table not found errors
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, 
        () => fetchUnreadCount()
      )
      .subscribe();
      
    // Listen for custom notification update events
    const handleNotificationUpdate = () => fetchUnreadCount();
    window.addEventListener('notificationsUpdated', handleNotificationUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('notificationsUpdated', handleNotificationUpdate);
    };
  }, [user]);

  return { unreadCount };
}