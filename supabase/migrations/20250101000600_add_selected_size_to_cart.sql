-- Add selected size to cart table
ALTER TABLE cart ADD COLUMN IF NOT EXISTS selected_size TEXT;