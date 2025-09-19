-- Add is_read column to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Update existing messages to be unread
UPDATE public.messages SET is_read = false WHERE is_read IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, sender_id, is_read);