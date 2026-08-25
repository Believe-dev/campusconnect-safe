-- Ensure sellers are visible to all users on seller search
DROP POLICY IF EXISTS "Sellers are visible to all users" ON profiles;

CREATE POLICY "Sellers are visible to all users" ON profiles
FOR SELECT
USING (
  account_type IN ('seller', 'both') 
  AND (is_banned IS NULL OR is_banned = false)
);

-- Ensure all users can view basic profile info for sellers
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
FOR SELECT
USING (true);