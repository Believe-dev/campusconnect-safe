import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useMessagesCount = () => {
  const { user } = useAuth();
  const [messagesCount, setMessagesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMessagesCount();
      
      const channel = supabase
        .channel('messages-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages'
          },
          () => {
            fetchMessagesCount();
          }
        )
        .subscribe();

      return () => {
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
      // First try with is_read column
      let { data, error } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      // If is_read column doesn't exist, try without it
      if (error && error.message?.includes('column')) {
        const result = await supabase
          .from('messages')
          .select('id')
          .eq('receiver_id', user.id);
        data = result.data;
        error = result.error;
      }

      // If messages table doesn't exist, silently fail
      if (error && (error.message?.includes('relation') || error.message?.includes('does not exist'))) {
        setMessagesCount(0);
        return;
      }

      if (error) throw error;

      setMessagesCount(data?.length || 0);
    } catch (error) {
      // Silently handle table/column not found errors
      setMessagesCount(0);
    } finally {
      setLoading(false);
    }
  };

  return { messagesCount, loading, refetch: fetchMessagesCount };
};