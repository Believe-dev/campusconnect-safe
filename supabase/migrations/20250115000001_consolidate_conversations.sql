-- Migration: Consolidate conversations between same users
-- This migration ensures all conversations between the same buyer and seller are consolidated into one

-- Step 1: Create function to find or create consolidated conversation
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

-- Step 2: Consolidate existing conversations
DO $$
DECLARE
    consolidation_record RECORD;
    merge_id UUID;
BEGIN
    -- Create temporary table to identify conversations to consolidate
    CREATE TEMP TABLE conversations_to_consolidate AS
    WITH conversation_groups AS (
      SELECT 
        LEAST(buyer_id, seller_id) as user1,
        GREATEST(buyer_id, seller_id) as user2,
        array_agg(id ORDER BY created_at ASC) as conversation_ids,
        COUNT(*) as conversation_count
      FROM conversations
      GROUP BY LEAST(buyer_id, seller_id), GREATEST(buyer_id, seller_id)
      HAVING COUNT(*) > 1
    )
    SELECT 
      user1,
      user2,
      conversation_ids[1] as keep_conversation_id,
      conversation_ids[2:] as merge_conversation_ids,
      conversation_count
    FROM conversation_groups;

    -- Move messages from duplicate conversations to the main conversation
    FOR consolidation_record IN SELECT * FROM conversations_to_consolidate LOOP
        FOREACH merge_id IN ARRAY consolidation_record.merge_conversation_ids LOOP
            UPDATE messages 
            SET conversation_id = consolidation_record.keep_conversation_id
            WHERE conversation_id = merge_id;
            
            RAISE NOTICE 'Moved messages from conversation % to %', merge_id, consolidation_record.keep_conversation_id;
        END LOOP;
    END LOOP;

    -- Delete the now-empty duplicate conversations
    DELETE FROM conversations 
    WHERE id IN (
        SELECT unnest(merge_conversation_ids) 
        FROM conversations_to_consolidate
    );

    -- Update remaining conversations to remove product_id (make them generic)
    UPDATE conversations 
    SET product_id = NULL 
    WHERE id IN (
        SELECT keep_conversation_id 
        FROM conversations_to_consolidate
    );

    -- Log consolidation results
    RAISE NOTICE 'Conversation consolidation completed. Groups affected: %, Conversations merged: %', 
        (SELECT COUNT(*) FROM conversations_to_consolidate),
        (SELECT SUM(conversation_count - 1) FROM conversations_to_consolidate);

    -- Clean up temp table
    DROP TABLE IF EXISTS conversations_to_consolidate;
END $$;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION find_or_create_consolidated_conversation TO authenticated;

-- Step 4: Add comments
COMMENT ON FUNCTION find_or_create_consolidated_conversation IS 'Finds existing conversation between two users or creates a new consolidated one';
COMMENT ON TABLE conversations IS 'Conversations are now consolidated - one conversation per buyer-seller pair regardless of products';