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
          .eq('is_read', false)
          .neq('type', 'message'); // Exclude message notifications from count
        
        // Handle various error cases gracefully
        if (error) {
          if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
            console.warn('Notifications table not found');
            setUnreadCount(0);
            return;
          }
          
          if (error.code === '42501' || error.message?.includes('permission denied')) {
            console.warn('Permission denied for notifications');
            setUnreadCount(0);
            return;
          }
          
          if (error.code === '23514' || error.message?.includes('check constraint')) {
            console.warn('Constraint violation in notifications');
            setUnreadCount(0);
            return;
          }
          
          console.error('Error fetching notification count:', error);
          setUnreadCount(0);
          return;
        }
        
        setUnreadCount(count || 0);
      } catch (error) {
        console.error('Unexpected error in fetchUnreadCount:', error);
        setUnreadCount(0);
      }
    };

    // Initial fetch
    fetchUnreadCount();

    // Subscribe to real-time updates with error handling
    const subscription = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('Notification change detected:', payload);
          fetchUnreadCount();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to notifications');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('Error subscribing to notifications channel');
        }
      });
      
    // Listen for custom notification update events
    const handleNotificationUpdate = () => {
      console.log('Custom notification update event received');
      fetchUnreadCount();
    };
    
    window.addEventListener('notificationsUpdated', handleNotificationUpdate);

    // Cleanup function
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('notificationsUpdated', handleNotificationUpdate);
    };
  }, [user]);

  return { unreadCount };
}