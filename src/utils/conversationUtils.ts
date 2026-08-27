import { supabase } from '@/integrations/supabase/client';

/**
 * Find or create a consolidated conversation between two users
 * All conversations between the same buyer and seller are consolidated into one
 */
export const findOrCreateConversation = async (
  buyerId: string, 
  sellerId: string, 
  productId?: string
): Promise<string | null> => {
  try {
    // Use the database function for consistent consolidated conversation handling
    const { data: conversationId, error } = await supabase.rpc(
      'find_or_create_consolidated_conversation',
      {
        p_buyer_id: buyerId,
        p_seller_id: sellerId,
        p_product_id: productId
      }
    );

    if (error) {
      console.error('Error finding or creating conversation:', error);
      return null;
    }

    return conversationId;
  } catch (error) {
    console.error('Error in findOrCreateConversation:', error);
    return null;
  }
};

/**
 * Marks messages from the other participant as delivered to this client.
 * Fire-and-forget — delivery status is a nice-to-have, not worth surfacing
 * an error toast over.
 */
export const markMessagesDelivered = async (conversationId: string): Promise<void> => {
  try {
    const { error } = await supabase.rpc('mark_messages_delivered', {
      p_conversation_id: conversationId,
    });
    if (error) {
      console.error('Error marking messages delivered:', error);
    }
  } catch (error) {
    console.error('Error in markMessagesDelivered:', error);
  }
};

/**
 * Single query for unread counts across many conversations, replacing the
 * one-count-query-per-conversation loop that used to live independently in
 * both Messages.tsx and MessageCountContext.tsx (an N+1 pattern — e.g. 20
 * conversations meant 20 extra round trips on every load).
 */
export const getUnreadCounts = async (
  userId: string,
  conversationIds: string[],
): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};
  if (conversationIds.length === 0) return counts;

  const { data: readData } = await supabase
    .from('conversation_reads')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId)
    .in('conversation_id', conversationIds);

  const readTimestamps: Record<string, string> = {};
  readData?.forEach((read) => {
    readTimestamps[read.conversation_id] = read.last_read_at;
  });

  const { data: unreadMessages } = await supabase
    .from('messages')
    .select('conversation_id, created_at')
    .in('conversation_id', conversationIds)
    .neq('sender_id', userId);

  unreadMessages?.forEach((message) => {
    const lastReadAt = readTimestamps[message.conversation_id] || '1970-01-01T00:00:00Z';
    if (message.created_at > lastReadAt) {
      counts[message.conversation_id] = (counts[message.conversation_id] || 0) + 1;
    }
  });

  return counts;
};