-- Fix paid sellers who are not showing in admin panel for approval
-- This addresses the issue where sellers who register and pay their fee don't appear in the sellers tab

-- Update profiles where seller registration is paid but seller_status is not set properly
UPDATE profiles 
SET 
    seller_status = 'pending',
    account_type = 'seller'
WHERE 
    seller_registration_paid = true 
    AND (seller_status IS NULL OR seller_status != 'pending')
    AND (account_type IS NULL OR account_type != 'seller');

-- Also update any sellers who have paid but might have been missed
UPDATE profiles 
SET seller_status = 'pending'
WHERE 
    seller_registration_paid = true 
    AND account_type = 'seller'
    AND seller_status IS NULL;

-- Create a function to ensure seller registration payment updates set proper status
CREATE OR REPLACE FUNCTION ensure_seller_status_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- When seller_registration_paid is set to true, ensure proper seller status
    IF NEW.seller_registration_paid = true AND (OLD.seller_registration_paid IS NULL OR OLD.seller_registration_paid = false) THEN
        NEW.account_type := 'seller';
        NEW.seller_status := 'pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set seller status when payment is recorded
DROP TRIGGER IF EXISTS ensure_seller_status_trigger ON profiles;
CREATE TRIGGER ensure_seller_status_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION ensure_seller_status_on_payment();

-- Update the fetchPendingSellers query to also include paid sellers
-- This is handled in the application code, but we ensure data consistency here

-- Log the fix
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM profiles 
    WHERE seller_registration_paid = true 
    AND account_type = 'seller'
    AND seller_status = 'pending';
    
    RAISE NOTICE 'Fixed % paid sellers to show in admin panel', updated_count;
END $$;