import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { showMessageNotification, showInfoNotification } from '@/utils/popupNotifications';

export const useRealTimeUpdates = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to cart changes
    const cartSubscription = supabase
      .channel(`cart_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Trigger cart count refresh
          window.dispatchEvent(new CustomEvent('cartUpdated'));
        }
      )
      .subscribe();

    // Subscribe to order changes
    const orderSubscription = supabase
      .channel(`orders_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Trigger orders count refresh
          window.dispatchEvent(new CustomEvent('ordersUpdated'));
        }
      )
      .subscribe();

    // Subscribe to message changes
    const messageSubscription = supabase
      .channel(`messages_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          // Trigger messages count refresh
          window.dispatchEvent(new CustomEvent('messagesUpdated'));
          
          // Show popup notification for new messages
          if (payload.new && payload.new.sender_id !== user.id) {
            showMessageNotification(
              'New Message',
              'You have received a new message'
            );
          }
        }
      )
      .subscribe();

    // Subscribe to notification changes
    const notificationSubscription = supabase
      .channel(`notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Trigger notifications refresh
          window.dispatchEvent(new CustomEvent('notificationsUpdated'));
          
          // Show popup notification
          if (payload.new) {
            showInfoNotification(
              payload.new.title || 'Notification',
              payload.new.message || 'You have a new notification',
              payload.new.action_url
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cartSubscription);
      supabase.removeChannel(orderSubscription);
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(notificationSubscription);
    };
  }, [user]);
};