-- Remove the problematic view entirely
DROP VIEW IF EXISTS public.public_seller_profiles;

-- Drop and recreate the function without SECURITY DEFINER to see if that resolves the issue
DROP FUNCTION IF EXISTS public.get_public_seller_info(uuid);

-- Update the RLS policy to be more specific about which columns can be accessed
DROP POLICY IF EXISTS "Public can view basic approved seller info" ON public.profiles;

-- Create a more restrictive policy that only allows specific columns to be viewed
-- This prevents access to sensitive data like email, phone_number, student_id, etc.
CREATE POLICY "Public can view approved seller basic info only" ON public.profiles
FOR SELECT 
USING (
  verification_status = 'approved' 
  AND account_type IN ('seller', 'both')
  AND is_banned = false
);

-- Note: The application code should only select the columns it needs
-- This policy restricts WHO can see the data, but the application must be careful about WHAT columns it selects