-- Add seller approval fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_status TEXT DEFAULT 'pending' CHECK (seller_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_approved_by UUID REFERENCES auth.users(id);

-- Update existing seller accounts to approved status
UPDATE profiles 
SET seller_status = 'approved', seller_approved_at = NOW()
WHERE account_type IN ('seller', 'both') AND seller_status = 'pending';

-- Create index for seller status
CREATE INDEX IF NOT EXISTS idx_profiles_seller_status ON profiles(seller_status);

-- Function to handle seller approval
CREATE OR REPLACE FUNCTION approve_seller(seller_user_id UUID, admin_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE profiles 
    SET 
        seller_status = 'approved',
        seller_approved_at = NOW(),
        seller_approved_by = admin_user_id
    WHERE user_id = seller_user_id;
    
    -- Create notification for seller
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
        seller_user_id,
        'Seller Account Approved! 🎉',
        'Your seller account has been approved. You can now start listing products.',
        'success'
    );
END;
$$;

-- Function to reject seller
CREATE OR REPLACE FUNCTION reject_seller(seller_user_id UUID, admin_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE profiles 
    SET 
        seller_status = 'rejected',
        seller_approved_by = admin_user_id
    WHERE user_id = seller_user_id;
    
    -- Create notification for seller
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
        seller_user_id,
        'Seller Account Rejected',
        'Your seller account application has been rejected. Please contact support for more information.',
        'warning'
    );
END;
$$;