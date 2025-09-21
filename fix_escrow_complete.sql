-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS release_escrow_funds(UUID);
DROP FUNCTION IF EXISTS release_escrow_to_wallet(UUID);
DROP FUNCTION IF EXISTS auto_release_escrow();

-- Create working escrow release function
CREATE OR REPLACE FUNCTION release_escrow_to_wallet(order_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    escrow_record escrow_transactions%ROWTYPE;
    seller_wallet_id UUID;
BEGIN
    -- Get escrow transaction for this order
    SELECT * INTO escrow_record 
    FROM escrow_transactions 
    WHERE order_id = order_id_param AND status = 'held';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Get or create seller wallet
    SELECT id INTO seller_wallet_id 
    FROM wallets 
    WHERE user_id = escrow_record.seller_id;
    
    IF NOT FOUND THEN
        INSERT INTO wallets (user_id) 
        VALUES (escrow_record.seller_id) 
        RETURNING id INTO seller_wallet_id;
    END IF;
    
    -- Update escrow status to released
    UPDATE escrow_transactions 
    SET 
        status = 'released', 
        released_at = NOW(), 
        updated_at = NOW()
    WHERE id = escrow_record.id;
    
    -- Credit seller wallet
    UPDATE wallets 
    SET 
        available_balance = available_balance + escrow_record.seller_amount,
        total_earnings = total_earnings + escrow_record.seller_amount,
        total_commission_paid = total_commission_paid + escrow_record.commission_amount,
        updated_at = NOW()
    WHERE id = seller_wallet_id;
    
    -- Record wallet transaction (only with existing columns)
    INSERT INTO wallet_transactions (
        wallet_id, 
        user_id, 
        type, 
        amount, 
        description, 
        reference_id, 
        reference_type
    ) VALUES (
        seller_wallet_id, 
        escrow_record.seller_id, 
        'credit', 
        escrow_record.seller_amount,
        'Payment received for order',
        escrow_record.order_id,
        'order'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create auto-release function
CREATE OR REPLACE FUNCTION auto_release_escrow()
RETURNS void AS $$
DECLARE
    escrow_record RECORD;
BEGIN
    -- Find escrows that should be auto-released
    FOR escrow_record IN 
        SELECT id, order_id FROM escrow_transactions 
        WHERE status = 'held' 
        AND auto_release_at IS NOT NULL 
        AND auto_release_at <= NOW()
    LOOP
        -- Release the escrow
        PERFORM release_escrow_to_wallet(escrow_record.order_id);
        
        -- Update order status to confirmed
        UPDATE orders 
        SET status = 'confirmed' 
        WHERE id = escrow_record.order_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;