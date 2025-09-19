-- Database functions for better performance with high concurrent users

-- 1. Function to get unread messages count efficiently
CREATE OR REPLACE FUNCTION get_unread_messages_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO unread_count
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  WHERE (c.buyer_id = user_uuid OR c.seller_id = user_uuid)
    AND m.sender_id != user_uuid
    AND m.is_read = false;
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to batch mark messages as read
CREATE OR REPLACE FUNCTION mark_conversation_messages_read(
  conv_id UUID, 
  user_uuid UUID
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE messages 
  SET is_read = true 
  WHERE conversation_id = conv_id 
    AND sender_id != user_uuid 
    AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to get conversation with last message efficiently
CREATE OR REPLACE FUNCTION get_conversations_with_last_message(user_uuid UUID)
RETURNS TABLE (
  conversation_id UUID,
  buyer_id UUID,
  seller_id UUID,
  product_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  last_message_content TEXT,
  last_message_created_at TIMESTAMP WITH TIME ZONE,
  last_message_sender_id UUID,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.buyer_id,
    c.seller_id,
    c.product_id,
    c.created_at,
    lm.content,
    lm.created_at,
    lm.sender_id,
    COALESCE(unread.count, 0)
  FROM conversations c
  LEFT JOIN LATERAL (
    SELECT content, created_at, sender_id
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as count
    FROM messages m
    WHERE m.conversation_id = c.id
      AND m.sender_id != user_uuid
      AND m.is_read = false
  ) unread ON true
  WHERE c.buyer_id = user_uuid OR c.seller_id = user_uuid
  ORDER BY COALESCE(lm.created_at, c.created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;