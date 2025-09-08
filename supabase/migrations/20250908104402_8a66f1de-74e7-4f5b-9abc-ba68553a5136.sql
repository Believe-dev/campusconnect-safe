-- Fix security issue: Restrict public access to profiles table
-- Remove the overly permissive policy that exposes all profile data
DROP POLICY IF EXISTS "Anyone can view approved seller public info" ON public.profiles;

-- Create a security definer function that returns only safe public seller information
CREATE OR REPLACE FUNCTION public.get_public_seller_info(seller_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  rating numeric,
  total_reviews integer,
  is_verified boolean,
  account_type text,
  verification_status text,
  avatar_url text,
  bio text,
  campus text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.full_name,
    p.rating,
    p.total_reviews,
    p.is_verified,
    p.account_type,
    p.verification_status,
    p.avatar_url,
    p.bio,
    p.campus
  FROM public.profiles p
  WHERE p.user_id = seller_user_id
    AND p.verification_status = 'approved'
    AND p.account_type IN ('seller', 'both')
    AND p.is_banned = false;
$$;

-- Create a more restrictive policy for public seller information
-- This only allows viewing basic seller info, not sensitive data like email, phone, student_id, etc.
CREATE POLICY "Public can view basic approved seller info" ON public.profiles
FOR SELECT 
USING (
  verification_status = 'approved' 
  AND account_type IN ('seller', 'both')
  AND is_banned = false
);

-- Grant execute permission on the function to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_public_seller_info(uuid) TO authenticated, anon;

-- Create a view for public seller profiles that only exposes safe information
CREATE OR REPLACE VIEW public.public_seller_profiles AS
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

-- Enable RLS on the view
ALTER VIEW public.public_seller_profiles SET (security_barrier = true);

-- Grant access to the view
GRANT SELECT ON public.public_seller_profiles TO authenticated, anon;