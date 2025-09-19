-- Ensure all existing messages have proper is_read status
UPDATE public.messages 
SET is_read = false 
WHERE is_read IS NULL;

-- Add default value for future messages
ALTER TABLE public.messages 
ALTER COLUMN is_read SET DEFAULT false;