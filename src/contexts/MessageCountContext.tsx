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

      let count = 0;
      for (const conv of conversations) {
        const { data } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', conv.id)
          .neq('sender_id', user.id)
          .eq('is_read', false);
        
        count += data?.length || 0;
      }

      setMessagesCount(Math.min(count, 99));
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