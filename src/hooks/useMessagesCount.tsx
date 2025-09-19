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
            // Only update if is_read changed and message is not from user
            if (payload.new.sender_id !== user.id && payload.old?.is_read !== payload.new?.is_read) {
              clearTimeout(updateTimeout);
              updateTimeout = setTimeout(fetchMessagesCount, 1000);
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
      // Simple approach: count messages from last 24 hours from others
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

      if (!conversations || conversations.length === 0) {
        setMessagesCount(0);
        return;
      }

      const conversationIds = conversations.map(c => c.id);

      // Count messages from others, excluding viewed conversations
      let totalUnread = 0;
      
      for (const convId of conversationIds) {
        const viewedKey = `viewed_${convId}_${user.id}`;
        const lastViewed = localStorage.getItem(viewedKey);
        
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .neq('sender_id', user.id)
          .gte('created_at', lastViewed || yesterday.toISOString());
          
        totalUnread += count || 0;
      }

      setMessagesCount(Math.min(totalUnread, 99));
    } catch (error) {
      console.error('Error in fetchMessagesCount:', error);
      setMessagesCount(0);
    } finally {
      setLoading(false);
    }
  };

  return { messagesCount, loading, refetch: fetchMessagesCount };
};