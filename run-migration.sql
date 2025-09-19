-- Run this in your Supabase SQL editor to add the is_read column

-- Add is_read column to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Update existing messages to be unread (null -> false)
UPDATE public.messages SET is_read = false WHERE is_read IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, sender_id, is_read);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'messages' AND column_name = 'is_read';