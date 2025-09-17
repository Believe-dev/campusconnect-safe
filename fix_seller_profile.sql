-- Fix seller profile creation issues

-- 1. Create or replace the profile creation trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert profile with user metadata
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    university_name,
    campus,
    student_id,
    account_type,
    seller_status,
    is_verified,
    rating,
    total_reviews
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'university_name',
    NEW.raw_user_meta_data->>'campus',
    NEW.raw_user_meta_data->>'student_id',
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'account_type' = 'seller' THEN 'pending'
      ELSE NULL
    END,
    false,
    0.0,
    0
  );

  -- Add user role based on account type
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer')
  );

  -- If buyer, also add buyer role explicitly
  IF COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer') = 'buyer' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'buyer')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Fix existing profiles with missing data and invalid account types
UPDATE profiles 
SET 
  full_name = COALESCE(full_name, email, 'User'),
  account_type = CASE 
    WHEN account_type = 'both' THEN 'seller'
    WHEN account_type NOT IN ('buyer', 'seller') OR account_type IS NULL THEN 'buyer'
    ELSE account_type
  END,
  rating = COALESCE(rating, 0.0),
  total_reviews = COALESCE(total_reviews, 0),
  is_verified = COALESCE(is_verified, false)
WHERE full_name IS NULL OR full_name = '' OR account_type IS NULL OR account_type NOT IN ('buyer', 'seller');

-- 5. Ensure all users have proper roles
INSERT INTO user_roles (user_id, role)
SELECT 
  p.user_id,
  p.account_type::app_role
FROM profiles p
WHERE p.account_type IN ('buyer', 'seller')
AND NOT EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = p.user_id 
  AND ur.role = p.account_type::app_role
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Add buyer role for all users (everyone can buy)
INSERT INTO user_roles (user_id, role)
SELECT 
  p.user_id,
  'buyer'::app_role
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = p.user_id 
  AND ur.role = 'buyer'::app_role
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Add seller role for users who had "both" account type
INSERT INTO user_roles (user_id, role)
SELECT 
  p.user_id,
  'seller'::app_role
FROM profiles p
WHERE p.account_type = 'seller'
AND NOT EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = p.user_id 
  AND ur.role = 'seller'::app_role
)
ON CONFLICT (user_id, role) DO NOTHING;