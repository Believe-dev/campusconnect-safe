-- Function to properly release escrow funds to seller wallet
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
    
    -- Credit seller wallet with the seller amount
    UPDATE wallets 
    SET 
        available_balance = available_balance + escrow_record.seller_amount,
        total_earnings = total_earnings + escrow_record.seller_amount,
        total_commission_paid = total_commission_paid + escrow_record.commission_amount,
        updated_at = NOW()
    WHERE id = seller_wallet_id;
    
    -- Record wallet transaction for seller payment
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
        'Payment received for order #' || SUBSTRING(escrow_record.order_id::text, 1, 8),
        escrow_record.order_id,
        'order'
    );
    
    -- Record commission transaction
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
        'commission', 
        escrow_record.commission_amount,
        'Platform commission for order #' || SUBSTRING(escrow_record.order_id::text, 1, 8),
        escrow_record.order_id,
        'commission'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process payout request
CREATE OR REPLACE FUNCTION process_payout_request(payout_id UUID, admin_user_id UUID, approve BOOLEAN, notes TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    payout_record payout_requests%ROWTYPE;
    wallet_record wallets%ROWTYPE;
BEGIN
    -- Get payout request
    SELECT * INTO payout_record 
    FROM payout_requests 
    WHERE id = payout_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Get wallet
    SELECT * INTO wallet_record 
    FROM wallets 
    WHERE id = payout_record.wallet_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    IF approve THEN
        -- Check if wallet has sufficient balance
        IF wallet_record.available_balance < payout_record.amount THEN
            -- Update payout request as failed
            UPDATE payout_requests 
            SET 
                status = 'failed',
                admin_notes = 'Insufficient wallet balance',
                processed_by = admin_user_id,
                processed_at = NOW(),
                updated_at = NOW()
            WHERE id = payout_id;
            RETURN FALSE;
        END IF;
        
        -- Deduct from wallet
        UPDATE wallets 
        SET 
            available_balance = available_balance - payout_record.amount,
            updated_at = NOW()
        WHERE id = payout_record.wallet_id;
        
        -- Record wallet transaction
        INSERT INTO wallet_transactions (
            wallet_id, 
            user_id, 
            type, 
            amount, 
            description, 
            reference_id, 
            reference_type,
            status
        ) VALUES (
            payout_record.wallet_id, 
            payout_record.user_id, 
            'payout', 
            payout_record.amount,
            'Payout to ' || payout_record.bank_name || ' - ' || payout_record.bank_account_name,
            payout_record.id,
            'payout',
            'completed'
        );
        
        -- Update payout request as completed
        UPDATE payout_requests 
        SET 
            status = 'completed',
            admin_notes = COALESCE(notes, 'Payout processed successfully'),
            processed_by = admin_user_id,
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = payout_id;
    ELSE
        -- Reject payout request
        UPDATE payout_requests 
        SET 
            status = 'failed',
            admin_notes = COALESCE(notes, 'Payout request rejected'),
            processed_by = admin_user_id,
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = payout_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;