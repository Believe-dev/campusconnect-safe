-- First, let's check and update the condition constraint to match our UI options
ALTER TABLE public.products 
DROP CONSTRAINT IF EXISTS products_condition_check;

ALTER TABLE public.products 
ADD CONSTRAINT products_condition_check 
CHECK (condition IN ('new', 'excellent', 'good', 'fair'));