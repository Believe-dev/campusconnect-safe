-- Fix product visibility for all users
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

-- Create new policy that allows everyone to see all active products
CREATE POLICY "Everyone can view all active products" ON public.products 
FOR SELECT USING (is_active = true);

-- Ensure admins can see all products (active and inactive)
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
CREATE POLICY "Admins can view all products" ON public.products 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);