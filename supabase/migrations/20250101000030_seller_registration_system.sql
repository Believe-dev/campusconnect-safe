-- Add seller registration payment tracking to profiles
ALTER TABLE profiles 
ADD COLUMN seller_registration_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN seller_registration_paid_at TIMESTAMP WITH TIME ZONE;

-- Create seller_registration_payments table
CREATE TABLE seller_registration_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_reference TEXT NOT NULL UNIQUE,
    payment_method TEXT NOT NULL DEFAULT 'paystack',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX idx_seller_registration_payments_user_id ON seller_registration_payments(user_id);
CREATE INDEX idx_seller_registration_payments_reference ON seller_registration_payments(payment_reference);
CREATE INDEX idx_seller_registration_payments_status ON seller_registration_payments(status);

-- Enable RLS
ALTER TABLE seller_registration_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own registration payments" ON seller_registration_payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own registration payments" ON seller_registration_payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all registration payments" ON seller_registration_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Update escrow system to remove commission (set to 0%)
CREATE OR REPLACE FUNCTION create_escrow_transaction()
RETURNS TRIGGER AS $$
DECLARE
    commission_rate DECIMAL(5,4) := 0.00; -- 0% commission - sellers pay registration fee instead
    seller_amount DECIMAL(10,2);
BEGIN
    -- Only create escrow when order status changes to 'paid'
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        seller_amount := NEW.total_amount; -- Seller gets full amount
        
        INSERT INTO escrow_transactions (
            order_id,
            buyer_id,
            seller_id,
            amount,
            commission_amount,
            seller_amount,
            auto_release_at
        ) VALUES (
            NEW.id,
            NEW.buyer_id,
            NEW.seller_id,
            NEW.total_amount,
            0.00, -- No commission
            seller_amount,
            NEW.auto_confirm_at
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update release escrow function to handle 0% commission
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
    
    -- Credit seller wallet with full amount (no commission deduction)
    UPDATE wallets 
    SET 
        available_balance = available_balance + escrow_record.seller_amount,
        total_earnings = total_earnings + escrow_record.seller_amount,
        updated_at = NOW()
    WHERE user_id = escrow_record.seller_id;
    
    -- Record wallet transaction for seller (full amount)
    INSERT INTO wallet_transactions (
        wallet_id, user_id, type, amount, description, reference_id, reference_type
    ) VALUES (
        seller_wallet_id, 
        escrow_record.seller_id, 
        'credit', 
        escrow_record.seller_amount,
        'Payment received for order (no commission)',
        escrow_record.order_id,
        'order'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for new table
ALTER TABLE seller_registration_payments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE seller_registration_payments;

-- Update existing orders to have 0 commission (optional - for data consistency)
UPDATE orders SET commission_amount = 0.00 WHERE commission_amount > 0;

-- Update existing escrow transactions to give sellers full amount
UPDATE escrow_transactions 
SET 
    commission_amount = 0.00,
    seller_amount = amount
WHERE commission_amount > 0;