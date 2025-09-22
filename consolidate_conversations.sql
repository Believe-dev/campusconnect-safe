-- Consolidate conversations between same users
-- This script merges multiple conversations between the same buyer and seller into one

-- Step 1: Create a temporary table to identify conversations to consolidate
CREATE TEMP TABLE conversations_to_consolidate AS
WITH conversation_groups AS (
  SELECT 
    LEAST(buyer_id, seller_id) as user1,
    GREATEST(buyer_id, seller_id) as user2,
    array_agg(id ORDER BY created_at ASC) as conversation_ids,
    array_agg(created_at ORDER BY created_at ASC) as created_dates,
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

-- Step 2: Move all messages from duplicate conversations to the main conversation
DO $$
DECLARE
    consolidation_record RECORD;
    merge_id UUID;
BEGIN
    FOR consolidation_record IN SELECT * FROM conversations_to_consolidate LOOP
        -- Move messages from each duplicate conversation to the main one
        FOREACH merge_id IN ARRAY consolidation_record.merge_conversation_ids LOOP
            UPDATE messages 
            SET conversation_id = consolidation_record.keep_conversation_id
            WHERE conversation_id = merge_id;
            
            RAISE NOTICE 'Moved messages from conversation % to %', merge_id, consolidation_record.keep_conversation_id;
        END LOOP;
    END LOOP;
END $$;

-- Step 3: Delete the now-empty duplicate conversations
DELETE FROM conversations 
WHERE id IN (
    SELECT unnest(merge_conversation_ids) 
    FROM conversations_to_consolidate
);

-- Step 4: Update remaining conversations to remove product_id (make them generic)
UPDATE conversations 
SET product_id = NULL 
WHERE id IN (
    SELECT keep_conversation_id 
    FROM conversations_to_consolidate
);

-- Step 5: Show consolidation results
SELECT 
    'Conversations consolidated' as action,
    COUNT(*) as affected_conversation_groups,
    SUM(conversation_count - 1) as conversations_merged
FROM conversations_to_consolidate;

-- Clean up temp table
DROP TABLE conversations_to_consolidate;

COMMENT ON TABLE conversations IS 'Conversations are now consolidated - one conversation per buyer-seller pair regardless of products';