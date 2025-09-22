-- Add reactions column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}';

-- Create index for better performance on reactions queries
CREATE INDEX IF NOT EXISTS idx_messages_reactions ON messages USING GIN (reactions);

COMMENT ON COLUMN messages.reactions IS 'JSON object storing emoji reactions with user IDs';