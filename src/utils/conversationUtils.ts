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

export const navigateToChat = (conversationId: string) => {
  window.location.href = `/messages?conversation=${conversationId}`;
};