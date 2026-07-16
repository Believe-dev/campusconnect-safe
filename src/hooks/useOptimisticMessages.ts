import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealTime } from '@/contexts/RealTimeContext';
import { markMessagesDelivered } from '@/utils/conversationUtils';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
  is_read?: boolean;
  delivered_at?: string | null;
  sender?: {
    full_name: string;
    avatar_url?: string;
  };
  _isOptimistic?: boolean;
  _isFailed?: boolean;
}

interface UseOptimisticMessagesProps {
  conversationId: string;
  currentUserId: string;
  otherUserId?: string | null;
}

export const useOptimisticMessages = ({ conversationId, currentUserId, otherUserId }: UseOptimisticMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherUserLastReadAt, setOtherUserLastReadAt] = useState<string | null>(null);
  const { subscribeToMessages, subscribeToConversationReads, optimisticUpdate } = useRealTime();
  const retryQueueRef = useRef<Map<string, Message>>(new Map());

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!sender_id (
            full_name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const processedMessages = data?.map(msg => ({
        ...msg,
        sender: msg.profiles
      })) || [];

      setMessages(processedMessages);

      // Opening/re-opening a conversation means this client has now
      // actually received any of the other participant's messages that
      // weren't marked delivered yet (e.g. they were sent while offline).
      const hasUndelivered = processedMessages.some(
        (msg) => msg.sender_id !== currentUserId && !msg.delivered_at
      );
      if (hasUndelivered) {
        markMessagesDelivered(conversationId);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, currentUserId]);

  // Handle real-time message updates
  useEffect(() => {
    const unsubscribe = subscribeToMessages(conversationId, (newMessage) => {
      if (newMessage._isUpdate) {
        // Handle message updates (delivered_at, is_read, etc.)
        setMessages(prev => prev.map(msg =>
          msg.id === newMessage.id ? { ...msg, ...newMessage } : msg
        ));
      } else {
        // Handle new messages
        if (newMessage.sender_id !== currentUserId) {
          // Only add if not from current user (avoid duplicates with optimistic updates)
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) return prev;

            return [...prev, {
              ...newMessage,
              sender: newMessage.sender || { full_name: 'Unknown User' }
            }];
          });
          // This client just received the message live — mark it delivered.
          markMessagesDelivered(conversationId);
        }
      }
    });

    return unsubscribe;
  }, [conversationId, currentUserId, subscribeToMessages]);

  // Track the other participant's last_read_at so outgoing messages can
  // show a real "seen" (blue tick) state instead of a fake always-on one.
  useEffect(() => {
    if (!otherUserId) return;

    let cancelled = false;

    const fetchOtherUserReadState = async () => {
      const { data } = await supabase
        .from('conversation_reads')
        .select('last_read_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', otherUserId)
        .maybeSingle();

      if (!cancelled && data) {
        setOtherUserLastReadAt(data.last_read_at);
      }
    };

    fetchOtherUserReadState();

    const unsubscribe = subscribeToConversationReads(conversationId, (read) => {
      if (read.user_id === otherUserId) {
        setOtherUserLastReadAt(read.last_read_at);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [conversationId, otherUserId, subscribeToConversationReads]);

  // Send message with optimistic updates
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMessage: Message = {
      id: tempId,
      content: content.trim(),
      sender_id: currentUserId,
      conversation_id: conversationId,
      created_at: new Date().toISOString(),
      _isOptimistic: true,
      sender: messages.find(m => m.sender_id === currentUserId)?.sender || {
        full_name: 'You'
      }
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    optimisticUpdate('message_sent', optimisticMessage);

    try {
      // Send to database
      const { data: insertedMessage, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: content.trim()
        })
        .select(`
          *,
          profiles!sender_id (
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { ...insertedMessage, sender: insertedMessage.profiles }
          : msg
      ));

      // Remove from retry queue if it was there
      retryQueueRef.current.delete(tempId);

    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Mark message as failed
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { ...msg, _isFailed: true }
          : msg
      ));

      // Add to retry queue
      retryQueueRef.current.set(tempId, optimisticMessage);
      
      // Retry after delay
      setTimeout(() => retryFailedMessage(tempId, content), 3000);
    }
  }, [conversationId, currentUserId, messages, optimisticUpdate]);

  // Retry failed messages
  const retryFailedMessage = useCallback(async (tempId: string, content: string) => {
    const failedMessage = retryQueueRef.current.get(tempId);
    if (!failedMessage) return;

    try {
      const { data: insertedMessage, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: content.trim()
        })
        .select(`
          *,
          profiles!sender_id (
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Replace failed message with successful one
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { ...insertedMessage, sender: insertedMessage.profiles }
          : msg
      ));

      retryQueueRef.current.delete(tempId);

    } catch (error) {
      console.error('Retry failed:', error);
      // Will retry again on next attempt or user action
    }
  }, [conversationId, currentUserId]);

  // Mark messages as read using conversation_reads table
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    // Optimistic update
    setMessages(prev => prev.map(msg => 
      messageIds.includes(msg.id) ? { ...msg, is_read: true } : msg
    ));

    try {
      // Update last read timestamp in conversation_reads table
      const { error } = await supabase
        .from('conversation_reads')
        .upsert({
          conversation_id: conversationId,
          user_id: currentUserId,
          last_read_at: new Date().toISOString()
        }, {
          onConflict: 'conversation_id,user_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      // Don't revert optimistic update for constraint violations
      if (error.code !== '23505') {
        setMessages(prev => prev.map(msg => 
          messageIds.includes(msg.id) ? { ...msg, is_read: false } : msg
        ));
      }
    }
  }, [currentUserId, conversationId]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    // Optimistic removal
    setMessages(prev => prev.filter(msg => msg.id !== messageId));

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', currentUserId); // Only allow deleting own messages

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete message:', error);
      // Revert optimistic update by refetching
      fetchMessages();
    }
  }, [currentUserId, fetchMessages]);

  // Retry all failed messages
  const retryAllFailed = useCallback(() => {
    retryQueueRef.current.forEach((message, tempId) => {
      retryFailedMessage(tempId, message.content);
    });
  }, [retryFailedMessage]);

  // Initialize
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    loading,
    sendMessage,
    markAsRead,
    deleteMessage,
    retryAllFailed,
    hasFailedMessages: retryQueueRef.current.size > 0,
    otherUserLastReadAt
  };
};