-- Ensure all users have wallets created
-- This migration fixes the PGRST116 error by ensuring every user has a wallet

-- Create wallets for all existing users who don't have them
INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings, total_commission_paid)
SELECT 
    p.user_id,
    0.00,
    0.00,
    0.00,
    0.00
FROM profiles p
WHERE p.user_id NOT IN (SELECT user_id FROM wallets)
ON CONFLICT (user_id) DO NOTHING;

-- Update the create_user_wallet function to be more robust
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings, total_commission_paid)
    VALUES (NEW.user_id, 0.00, 0.00, 0.00, 0.00)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create a function to ensure wallet exists for any user
CREATE OR REPLACE FUNCTION ensure_user_wallet(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    wallet_id UUID;
BEGIN
    -- Try to get existing wallet
    SELECT id INTO wallet_id FROM wallets WHERE user_id = p_user_id;
    
    -- If no wallet exists, create one
    IF wallet_id IS NULL THEN
        INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings, total_commission_paid)
        VALUES (p_user_id, 0.00, 0.00, 0.00, 0.00)
        RETURNING id INTO wallet_id;
    END IF;
    
    RETURN wallet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION ensure_user_wallet(UUID) TO authenticated;