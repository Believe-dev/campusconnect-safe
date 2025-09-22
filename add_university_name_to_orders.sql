-- Add university_name column to orders table
ALTER TABLE public.orders ADD COLUMN university_name TEXT;

-- Add comment to the column
COMMENT ON COLUMN public.orders.university_name IS 'University name of the buyer';