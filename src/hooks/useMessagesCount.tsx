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
            // Update immediately when is_read changes for messages not from current user
            if (payload.new.sender_id !== user.id && payload.old?.is_read !== payload.new?.is_read) {
              if (payload.new.is_read === true) {
                // Immediately decrease count when message is marked as read
                setMessagesCount(prev => Math.max(0, prev - 1));
              }
              clearTimeout(updateTimeout);
              updateTimeout = setTimeout(fetchMessagesCount, 100);
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

      // Count unread messages by iterating through conversations
      let count = 0;
      let error = null;
      
      for (const conv of conversations) {
        try {
          const response = await (supabase as any)
            .from('messages')
            .select('id')
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .eq('is_read', false);
          
          if (response.data) {
            count += response.data.length;
          }
        } catch (e) {
          error = e;
          break;
        }
      }

      if (error) {
        console.error('Error counting messages:', error);
      }
      


      setMessagesCount(Math.min(count, 99));
      

    } catch (error) {
      console.error('Error in fetchMessagesCount:', error);
      setMessagesCount(0);
    } finally {
      setLoading(false);
    }
  };

  return { messagesCount, loading, refetch: fetchMessagesCount };
};