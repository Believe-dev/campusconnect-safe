import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { checkAndAddIsReadColumn } from '@/utils/migrationHelper';

// Extend Window interface
declare global {
  interface Window {
    refreshMessageCount?: () => void;
  }
}

export const useMessagesCount = () => {
  const { user } = useAuth();
  const [messagesCount, setMessagesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMessagesCount();
      
      // Expose refresh function globally
      window.refreshMessageCount = fetchMessagesCount;
      
      // Listen for custom events when messages are read
      const handleMessagesRead = () => {
        fetchMessagesCount();
      };
      const handleMessagesUpdate = () => {
        fetchMessagesCount();
      };
      window.addEventListener('messagesRead', handleMessagesRead);
      window.addEventListener('messagesUpdated', handleMessagesUpdate);
      
      // Throttled real-time updates for performance
      let updateTimeout: NodeJS.Timeout;
      const channel = supabase
        .channel(`messages_count_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            // Only update if message is not from current user
            if (payload.new.sender_id !== user.id) {
              clearTimeout(updateTimeout);
              updateTimeout = setTimeout(fetchMessagesCount, 2000);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            // Update when is_read changes for messages not from current user
            if (payload.new.sender_id !== user.id && payload.old?.is_read !== payload.new?.is_read) {
              console.log('Message read status changed, refreshing count');
              clearTimeout(updateTimeout);
              updateTimeout = setTimeout(fetchMessagesCount, 500);
            }
          }
        )
        .subscribe();

      return () => {
        clearTimeout(updateTimeout);
        window.removeEventListener('messagesRead', handleMessagesRead);
        window.removeEventListener('messagesUpdated', handleMessagesUpdate);
        delete window.refreshMessageCount;
        supabase.removeChannel(channel);
      };
    } else {
      setMessagesCount(0);
      setLoading(false);
    }
  }, [user]);

  const fetchMessagesCount = async () => {
    if (!user) {
      setMessagesCount(0);
      setLoading(false);
      return;
    }

    try {
      // Get conversations where user is involved
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

      if (!conversations || conversations.length === 0) {
        setMessagesCount(0);
        return;
      }

      // Count unread messages in user's conversations
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversations.map(c => c.id))
        .neq('sender_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error counting messages:', error);
      }
      
      console.log('Unread count for user', user.id, ':', count);
      console.log('Setting messages count to:', Math.min(count || 0, 99));

      setMessagesCount(Math.min(count || 0, 99));
      
      // Also log the actual state update
      setTimeout(() => {
        console.log('Messages count state updated');
      }, 100);
    } catch (error) {
      console.error('Error in fetchMessagesCount:', error);
      setMessagesCount(0);
    } finally {
      setLoading(false);
    }
  };

  return { messagesCount, loading, refetch: fetchMessagesCount };
};