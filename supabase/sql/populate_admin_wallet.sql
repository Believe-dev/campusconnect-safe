-- Run this after creating the admin wallet tables to populate with existing commissions

-- Calculate total commissions from released escrow transactions
DO $$
DECLARE
    total_existing_commissions DECIMAL(12,2);
BEGIN
    -- Get sum of all commission amounts from released escrow transactions
    SELECT COALESCE(SUM(commission_amount), 0) 
    INTO total_existing_commissions
    FROM escrow_transactions 
    WHERE status = 'released';
    
    -- Update admin wallet with existing commissions
    UPDATE admin_wallet 
    SET 
        total_commissions = total_existing_commissions,
        available_balance = total_existing_commissions,
        updated_at = NOW()
    WHERE id = (SELECT id FROM admin_wallet LIMIT 1);
    
    -- Log the result
    RAISE NOTICE 'Admin wallet populated with ₦% in existing commissions', total_existing_commissions;
END $$;