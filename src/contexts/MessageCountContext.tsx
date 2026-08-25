import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface MessageCountContextType {
  messagesCount: number;
  decreaseCount: (amount: number) => void;
  refreshCount: () => void;
}

const MessageCountContext = createContext<MessageCountContextType | undefined>(undefined);

export const MessageCountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [messagesCount, setMessagesCount] = useState(0);

  const fetchCount = async () => {
    if (!user) {
      setMessagesCount(0);
      return;
    }

    try {
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

      if (!conversations?.length) {
        setMessagesCount(0);
        return;
      }

      const convIds = conversations.map(c => c.id);
      
      // Batch fetch all read timestamps
      const { data: readData } = await supabase
        .from('conversation_reads')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id)
        .in('conversation_id', convIds);
      
      // Create lookup map for read timestamps
      const readTimestamps = {};
      readData?.forEach(read => {
        readTimestamps[read.conversation_id] = read.last_read_at;
      });
      
      let totalCount = 0;
      // Count unread messages for each conversation
      for (const convId of convIds) {
        const lastReadAt = readTimestamps[convId] || '1970-01-01T00:00:00Z';
        
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .neq('sender_id', user.id)
          .gt('created_at', lastReadAt);
        
        totalCount += count || 0;
      }

      setMessagesCount(Math.min(totalCount, 99));
    } catch (error) {
      console.error('Error fetching message count:', error);
    }
  };

  const decreaseCount = (amount: number) => {
    setMessagesCount(prev => Math.max(0, prev - amount));
  };

  const refreshCount = () => {
    fetchCount();
  };

  useEffect(() => {
    if (user) {
      fetchCount();
      
      // Set up real-time subscription for new messages only
      const channel = supabase
        .channel(`message_count_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            // Only increment if it's a message for this user from someone else
            if (payload.new.sender_id !== user.id) {
              setMessagesCount(prev => prev + 1);
            }
          }
        )
        .subscribe();
      
      return () => {
        channel.unsubscribe();
      };
    }
  }, [user]);

  return (
    <MessageCountContext.Provider value={{ messagesCount, decreaseCount, refreshCount }}>
      {children}
    </MessageCountContext.Provider>
  );
};

export const useMessageCount = () => {
  const context = useContext(MessageCountContext);
  if (!context) {
    throw new Error('useMessageCount must be used within MessageCountProvider');
  }
  return context;
};