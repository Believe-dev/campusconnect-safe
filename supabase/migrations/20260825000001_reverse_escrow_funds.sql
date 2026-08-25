-- Function to reverse escrow funds back to the buyer (dispute resolved in buyer's favor).
-- Mirrors release_escrow_funds() but credits the buyer instead of the seller.
-- Guarded on status = 'held' so a retried call is a no-op, matching release_escrow_funds' idempotency.
CREATE OR REPLACE FUNCTION reverse_escrow_funds(escrow_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    escrow_record escrow_transactions%ROWTYPE;
    buyer_wallet_id UUID;
BEGIN
    SELECT * INTO escrow_record FROM escrow_transactions WHERE id = escrow_id AND status = 'held';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    SELECT id INTO buyer_wallet_id FROM wallets WHERE user_id = escrow_record.buyer_id;

    UPDATE escrow_transactions
    SET status = 'refunded', updated_at = NOW()
    WHERE id = escrow_id;

    UPDATE wallets
    SET available_balance = available_balance + escrow_record.amount,
        updated_at = NOW()
    WHERE user_id = escrow_record.buyer_id;

    INSERT INTO wallet_transactions (
        wallet_id, user_id, type, amount, description, reference_id, reference_type
    ) VALUES (
        buyer_wallet_id,
        escrow_record.buyer_id,
        'refund',
        escrow_record.amount,
        'Order payment reversed to buyer (dispute resolved in buyer favor)',
        escrow_record.order_id,
        'order'
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
