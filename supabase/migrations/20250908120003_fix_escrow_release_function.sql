-- Fix release_escrow_funds function to properly handle wallet_id
CREATE OR REPLACE FUNCTION release_escrow_funds(escrow_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    escrow_record escrow_transactions%ROWTYPE;
    seller_wallet_id UUID;
BEGIN
    -- Get escrow transaction
    SELECT * INTO escrow_record FROM escrow_transactions WHERE id = escrow_id AND status = 'held';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Ensure seller has a wallet (create if doesn't exist)
    INSERT INTO wallets (user_id)
    VALUES (escrow_record.seller_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get seller wallet ID
    SELECT id INTO seller_wallet_id FROM wallets WHERE user_id = escrow_record.seller_id;
    
    IF seller_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Failed to get or create wallet for seller';
    END IF;
    
    -- Update escrow status
    UPDATE escrow_transactions 
    SET status = 'released', released_at = NOW(), updated_at = NOW()
    WHERE id = escrow_id;
    
    -- Credit seller wallet
    UPDATE wallets 
    SET 
        available_balance = available_balance + escrow_record.seller_amount,
        total_earnings = total_earnings + escrow_record.seller_amount,
        total_commission_paid = total_commission_paid + escrow_record.commission_amount,
        updated_at = NOW()
    WHERE user_id = escrow_record.seller_id;
    
    -- Record wallet transaction for seller (only if amount > 0)
    IF escrow_record.seller_amount > 0 THEN
        INSERT INTO wallet_transactions (
            wallet_id, user_id, type, amount, description, reference_id, reference_type
        ) VALUES (
            seller_wallet_id, 
            escrow_record.seller_id, 
            'credit', 
            escrow_record.seller_amount,
            'Payment received for order',
            escrow_record.order_id,
            'order'
        );
    END IF;
    
    -- Record commission transaction (only if commission > 0)
    IF escrow_record.commission_amount > 0 THEN
        INSERT INTO wallet_transactions (
            wallet_id, user_id, type, amount, description, reference_id, reference_type
        ) VALUES (
            seller_wallet_id, 
            escrow_record.seller_id, 
            'commission', 
            escrow_record.commission_amount,
            'Platform commission deducted',
            escrow_record.order_id,
            'commission'
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure all existing users have wallets
CREATE OR REPLACE FUNCTION ensure_all_users_have_wallets()
RETURNS void AS $$
BEGIN
    -- Create wallets for all users who don't have one
    INSERT INTO wallets (user_id)
    SELECT p.user_id 
    FROM profiles p
    LEFT JOIN wallets w ON p.user_id = w.user_id
    WHERE w.user_id IS NULL
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to ensure all users have wallets
SELECT ensure_all_users_have_wallets();