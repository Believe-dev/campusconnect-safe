-- Update existing messages to have is_read = false by default
UPDATE public.messages SET is_read = false WHERE is_read IS NULL;