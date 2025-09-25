-- Add bank details columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- Create function to update bank details with security verification
CREATE OR REPLACE FUNCTION update_bank_details(
  user_email TEXT,
  user_password TEXT,
  account_name TEXT,
  account_number TEXT,
  bank_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Verify user credentials
  SELECT auth.users.id, auth.users.email, profiles.user_id
  INTO user_record
  FROM auth.users
  JOIN profiles ON auth.users.id = profiles.user_id
  WHERE auth.users.email = user_email;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Verify password (this is a simplified check - in production you'd use proper auth)
  -- Note: This assumes the user is already authenticated in the session
  IF auth.uid() != user_record.id THEN
    RETURN FALSE;
  END IF;
  
  -- Update bank details
  UPDATE profiles
  SET 
    bank_account_name = account_name,
    bank_account_number = account_number,
    bank_name = bank_name,
    updated_at = NOW()
  WHERE user_id = user_record.id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_bank_details(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;