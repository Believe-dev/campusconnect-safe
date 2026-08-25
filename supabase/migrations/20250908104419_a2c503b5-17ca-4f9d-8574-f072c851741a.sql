-- Fix the security definer view issue
-- Drop the problematic view and recreate it without security_barrier
DROP VIEW IF EXISTS public.public_seller_profiles;

-- Recreate the view without security_barrier (views don't need SECURITY DEFINER)
CREATE VIEW public.public_seller_profiles AS
SELECT 
  user_id,
  full_name,
  rating,
  total_reviews,
  is_verified,
  account_type,
  verification_status,
  avatar_url,
  bio,
  campus,
  created_at
FROM public.profiles
WHERE verification_status = 'approved'
  AND account_type IN ('seller', 'both')
  AND is_banned = false;

-- Grant access to the view
GRANT SELECT ON public.public_seller_profiles TO authenticated, anon;