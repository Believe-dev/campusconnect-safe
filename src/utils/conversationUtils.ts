import { supabase } from '@/integrations/supabase/client';

export const findOrCreateConversation = async (
  buyerId: string, 
  sellerId: string, 
  productId?: string
): Promise<string | null> => {
  try {
    // First, try to find existing conversation between these users
    const { data: existingConversation, error: findError } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(buyer_id.eq.${buyerId},seller_id.eq.${sellerId}),and(buyer_id.eq.${sellerId},seller_id.eq.${buyerId})`)
      .maybeSingle();

    if (findError && findError.code !== 'PGRST116') {
      throw findError;
    }

    // If conversation exists, return its ID
    if (existingConversation) {
      return existingConversation.id;
    }

    // Create new conversation
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        buyer_id: buyerId,
        seller_id: sellerId,
        product_id: productId
      })
      .select('id')
      .single();

    if (createError) throw createError;

    return newConversation.id;
  } catch (error) {
    console.error('Error finding or creating conversation:', error);
    return null;
  }
};

export const navigateToChat = (conversationId: string) => {
  window.location.href = `/messages?conversation=${conversationId}`;
};