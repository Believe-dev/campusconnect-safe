-- Fix the release_escrow_funds function
CREATE OR REPLACE FUNCTION release_escrow_funds(escrow_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $function$
DECLARE
    escrow_record escrow_transactions%ROWTYPE;
    seller_wallet_id UUID;
BEGIN
    SELECT * INTO escrow_record FROM escrow_transactions WHERE id = escrow_id AND status = 'held';
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    -- Get or create seller wallet
    INSERT INTO wallets (user_id) VALUES (escrow_record.seller_id) ON CONFLICT (user_id) DO NOTHING;
    SELECT id INTO seller_wallet_id FROM wallets WHERE user_id = escrow_record.seller_id;
    
    UPDATE escrow_transactions SET status = 'released', released_at = NOW(), updated_at = NOW() WHERE id = escrow_id;
    
    UPDATE wallets SET 
        available_balance = available_balance + escrow_record.seller_amount,
        total_earnings = total_earnings + escrow_record.seller_amount,
        total_commission_paid = total_commission_paid + escrow_record.commission_amount,
        updated_at = NOW()
    WHERE user_id = escrow_record.seller_id;
    
    INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, description, reference_id, reference_type)
    VALUES (seller_wallet_id, escrow_record.seller_id, 'credit', escrow_record.seller_amount, 'Payment received for order', escrow_record.order_id, 'order');
    
    RETURN TRUE;
END;
$function$;