-- Add bank details columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_bank_details ON profiles(user_id) WHERE bank_account_name IS NOT NULL;