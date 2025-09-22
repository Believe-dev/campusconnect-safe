-- Create function to find or create consolidated conversation
CREATE OR REPLACE FUNCTION find_or_create_consolidated_conversation(
  p_buyer_id UUID,
  p_seller_id UUID,
  p_product_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Try to find existing conversation between these users (regardless of product)
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE (buyer_id = p_buyer_id AND seller_id = p_seller_id)
     OR (buyer_id = p_seller_id AND seller_id = p_buyer_id)
  LIMIT 1;

  -- If conversation exists, return its ID
  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create new consolidated conversation (without specific product_id)
  INSERT INTO conversations (buyer_id, seller_id, product_id)
  VALUES (p_buyer_id, p_seller_id, NULL)
  RETURNING id INTO v_conversation_id;

  RETURN v_conversation_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_or_create_consolidated_conversation TO authenticated;

COMMENT ON FUNCTION find_or_create_consolidated_conversation IS 'Finds existing conversation between two users or creates a new consolidated one';