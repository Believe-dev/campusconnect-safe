-- Allow users to delete their own conversations and messages
DROP POLICY IF EXISTS "Users can delete conversations" ON public.conversations;
CREATE POLICY "Users can delete conversations" 
ON public.conversations 
FOR DELETE 
USING ((auth.uid() = buyer_id) OR (auth.uid() = seller_id));

DROP POLICY IF EXISTS "Users can delete messages" ON public.messages;
CREATE POLICY "Users can delete messages" 
ON public.messages 
FOR DELETE 
USING (auth.uid() = sender_id);

-- Update conversations table to remove product_id dependency for seller consolidation
-- Add a function to find or create conversation between buyer and seller
CREATE OR REPLACE FUNCTION public.find_or_create_conversation(
  p_buyer_id UUID,
  p_seller_id UUID,
  p_product_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- Try to find existing conversation between buyer and seller
  SELECT id INTO conversation_id
  FROM conversations
  WHERE buyer_id = p_buyer_id AND seller_id = p_seller_id
  LIMIT 1;
  
  -- If no conversation exists, create one
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (buyer_id, seller_id, product_id, is_active)
    VALUES (p_buyer_id, p_seller_id, p_product_id, true)
    RETURNING id INTO conversation_id;
  END IF;
  
  RETURN conversation_id;
END;
$$;