-- Create admin_wallet table for platform commission tracking
CREATE TABLE admin_wallet (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    total_commissions DECIMAL(12,2) DEFAULT 0.00,
    available_balance DECIMAL(12,2) DEFAULT 0.00,
    total_withdrawn DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create admin_withdrawals table for tracking admin withdrawals
CREATE TABLE admin_withdrawals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    transfer_code TEXT,
    paystack_reference TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert initial admin wallet record
INSERT INTO admin_wallet (id) VALUES (gen_random_uuid());

-- Add indexes
CREATE INDEX idx_admin_withdrawals_admin_id ON admin_withdrawals(admin_id);
CREATE INDEX idx_admin_withdrawals_status ON admin_withdrawals(status);

-- Enable RLS
ALTER TABLE admin_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can access
CREATE POLICY "Only admins can access admin wallet" ON admin_wallet
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can access admin withdrawals" ON admin_withdrawals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Function to update admin wallet when commissions are earned
CREATE OR REPLACE FUNCTION update_admin_wallet_commission(commission_amount DECIMAL(12,2))
RETURNS void AS $$
BEGIN
    UPDATE admin_wallet 
    SET 
        total_commissions = total_commissions + commission_amount,
        available_balance = available_balance + commission_amount,
        updated_at = NOW()
    WHERE id = (SELECT id FROM admin_wallet LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process admin withdrawal
CREATE OR REPLACE FUNCTION process_admin_withdrawal(
    p_admin_id UUID,
    p_amount DECIMAL(12,2),
    p_bank_name TEXT,
    p_account_number TEXT,
    p_account_name TEXT
)
RETURNS UUID AS $$
DECLARE
    withdrawal_id UUID;
    current_balance DECIMAL(12,2);
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = p_admin_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can withdraw funds';
    END IF;
    
    -- Get current available balance
    SELECT available_balance INTO current_balance 
    FROM admin_wallet 
    WHERE id = (SELECT id FROM admin_wallet LIMIT 1);
    
    -- Check if sufficient balance
    IF current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Requested: %', current_balance, p_amount;
    END IF;
    
    -- Create withdrawal request
    INSERT INTO admin_withdrawals (
        admin_id, amount, bank_name, account_number, account_name
    ) VALUES (
        p_admin_id, p_amount, p_bank_name, p_account_number, p_account_name
    ) RETURNING id INTO withdrawal_id;
    
    -- Deduct from available balance (will be restored if withdrawal fails)
    UPDATE admin_wallet 
    SET 
        available_balance = available_balance - p_amount,
        updated_at = NOW()
    WHERE id = (SELECT id FROM admin_wallet LIMIT 1);
    
    RETURN withdrawal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete admin withdrawal
CREATE OR REPLACE FUNCTION complete_admin_withdrawal(
    p_withdrawal_id UUID,
    p_transfer_code TEXT,
    p_paystack_reference TEXT
)
RETURNS void AS $$
DECLARE
    withdrawal_amount DECIMAL(12,2);
BEGIN
    -- Get withdrawal amount
    SELECT amount INTO withdrawal_amount 
    FROM admin_withdrawals 
    WHERE id = p_withdrawal_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Withdrawal not found or already processed';
    END IF;
    
    -- Update withdrawal status
    UPDATE admin_withdrawals 
    SET 
        status = 'completed',
        transfer_code = p_transfer_code,
        paystack_reference = p_paystack_reference,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_withdrawal_id;
    
    -- Update admin wallet
    UPDATE admin_wallet 
    SET 
        total_withdrawn = total_withdrawn + withdrawal_amount,
        updated_at = NOW()
    WHERE id = (SELECT id FROM admin_wallet LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fail admin withdrawal (restore balance)
CREATE OR REPLACE FUNCTION fail_admin_withdrawal(
    p_withdrawal_id UUID,
    p_error_message TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    withdrawal_amount DECIMAL(12,2);
BEGIN
    -- Get withdrawal amount
    SELECT amount INTO withdrawal_amount 
    FROM admin_withdrawals 
    WHERE id = p_withdrawal_id AND status IN ('pending', 'processing');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Withdrawal not found or already processed';
    END IF;
    
    -- Update withdrawal status
    UPDATE admin_withdrawals 
    SET 
        status = 'failed',
        updated_at = NOW()
    WHERE id = p_withdrawal_id;
    
    -- Restore balance to admin wallet
    UPDATE admin_wallet 
    SET 
        available_balance = available_balance + withdrawal_amount,
        updated_at = NOW()
    WHERE id = (SELECT id FROM admin_wallet LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing release_escrow_funds function to also update admin wallet
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
    
    -- Get seller wallet
    SELECT id INTO seller_wallet_id FROM wallets WHERE user_id = escrow_record.seller_id;
    
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
    
    -- Record wallet transaction for seller
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
    
    -- Record commission transaction
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
    
    -- Update admin wallet with commission
    PERFORM update_admin_wallet_commission(escrow_record.commission_amount);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for new tables
ALTER TABLE admin_wallet REPLICA IDENTITY FULL;
ALTER TABLE admin_withdrawals REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE admin_wallet;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_withdrawals;