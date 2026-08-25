-- Update the account_type column to accept 'both' value
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_account_type_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_account_type_check 
CHECK (account_type IN ('buyer', 'seller', 'both'));