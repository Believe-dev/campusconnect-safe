-- Add university_name column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS university_name TEXT;