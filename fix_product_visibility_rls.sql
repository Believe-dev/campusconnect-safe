-- Fix product visibility by updating RLS policies
-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Sellers can manage their products" ON public.products;
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "Sellers can manage own products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;

-- Create new comprehensive policies
-- Allow everyone to view all active products (no restrictions)
CREATE POLICY "Public can view active products" ON public.products 
FOR SELECT USING (is_active = true);

-- Allow sellers to manage their own products
CREATE POLICY "Sellers can manage own products" ON public.products 
FOR ALL USING (auth.uid() = seller_id);

-- Allow admins to see and manage all products
CREATE POLICY "Admins can manage all products" ON public.products 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Ensure all products are set to active (in case some are inactive)
UPDATE public.products SET is_active = true WHERE is_active = false;

-- Create missing profiles for any users who don't have them
INSERT INTO public.profiles (user_id, email, full_name, account_type)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'buyer'
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;