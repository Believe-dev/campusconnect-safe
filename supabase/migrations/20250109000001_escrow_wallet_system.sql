-- Create wallets table for user balances
CREATE TABLE IF NOT EXISTS wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    available_balance DECIMAL(10,2) DEFAULT 0.00,
    pending_balance DECIMAL(10,2) DEFAULT 0.00,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    total_commission_paid DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Create escrow_transactions table for holding funds
CREATE TABLE IF NOT EXISTS escrow_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    seller_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'held' CHECK (status IN ('held', 'released', 'refunded', 'disputed')),
    held_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    released_at TIMESTAMP WITH TIME ZONE,
    auto_release_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(order_id)
);

-- Create wallet_transactions table for transaction history
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'commission', 'payout', 'refund')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    reference_id UUID, -- Can reference order_id, escrow_transaction_id, etc.
    reference_type TEXT, -- 'order', 'escrow', 'payout', etc.
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create payout_requests table for seller withdrawals
CREATE TABLE IF NOT EXISTS payout_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    bank_account_name TEXT NOT NULL,
    bank_account_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    admin_notes TEXT,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create disputes table for order issues
CREATE TABLE IF NOT EXISTS disputes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    escrow_transaction_id UUID NOT NULL REFERENCES escrow_transactions(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    resolution TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_order_id ON escrow_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_status ON escrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- Enable RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallets
DROP POLICY IF EXISTS "Users can view their own wallet" ON wallets;
CREATE POLICY "Users can view their own wallet" ON wallets
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own wallet" ON wallets;
CREATE POLICY "Users can update their own wallet" ON wallets
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all wallets" ON wallets;
CREATE POLICY "Admins can view all wallets" ON wallets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for escrow_transactions
DROP POLICY IF EXISTS "Users can view their escrow transactions" ON escrow_transactions;
CREATE POLICY "Users can view their escrow transactions" ON escrow_transactions
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Admins can manage all escrow transactions" ON escrow_transactions;
CREATE POLICY "Admins can manage all escrow transactions" ON escrow_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for wallet_transactions
DROP POLICY IF EXISTS "Users can view their wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can view their wallet transactions" ON wallet_transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON wallet_transactions;
CREATE POLICY "Admins can view all wallet transactions" ON wallet_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for payout_requests
DROP POLICY IF EXISTS "Users can manage their payout requests" ON payout_requests;
CREATE POLICY "Users can manage their payout requests" ON payout_requests
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all payout requests" ON payout_requests;
CREATE POLICY "Admins can manage all payout requests" ON payout_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for disputes
DROP POLICY IF EXISTS "Users can view disputes they're involved in" ON disputes;
CREATE POLICY "Users can view disputes they're involved in" ON disputes
    FOR SELECT USING (
        auth.uid() = reported_by OR 
        auth.uid() IN (
            SELECT buyer_id FROM orders WHERE id = order_id
            UNION
            SELECT seller_id FROM orders WHERE id = order_id
        )
    );

DROP POLICY IF EXISTS "Users can create disputes for their orders" ON disputes;
CREATE POLICY "Users can create disputes for their orders" ON disputes
    FOR INSERT WITH CHECK (
        auth.uid() = reported_by AND
        auth.uid() IN (
            SELECT buyer_id FROM orders WHERE id = order_id
            UNION
            SELECT seller_id FROM orders WHERE id = order_id
        )
    );

DROP POLICY IF EXISTS "Admins can manage all disputes" ON disputes;
CREATE POLICY "Admins can manage all disputes" ON disputes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Function to create wallet for new users
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallets (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create wallet when profile is created
DROP TRIGGER IF EXISTS create_wallet_on_profile_creation ON profiles;
CREATE TRIGGER create_wallet_on_profile_creation
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_user_wallet();

-- Function to create escrow transaction when order is paid (Updated for 0% commission)
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

-- Trigger to create escrow transaction
DROP TRIGGER IF EXISTS create_escrow_on_payment ON orders;
CREATE TRIGGER create_escrow_on_payment
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_escrow_transaction();

-- Function to release escrow funds
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
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-release escrow funds
CREATE OR REPLACE FUNCTION auto_release_escrow()
RETURNS void AS $$
DECLARE
    escrow_record RECORD;
BEGIN
    -- Find escrows that should be auto-released
    FOR escrow_record IN 
        SELECT id FROM escrow_transactions 
        WHERE status = 'held' 
        AND auto_release_at IS NOT NULL 
        AND auto_release_at <= NOW()
    LOOP
        PERFORM release_escrow_funds(escrow_record.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for new tables
ALTER TABLE wallets REPLICA IDENTITY FULL;
ALTER TABLE escrow_transactions REPLICA IDENTITY FULL;
ALTER TABLE wallet_transactions REPLICA IDENTITY FULL;
ALTER TABLE payout_requests REPLICA IDENTITY FULL;
ALTER TABLE disputes REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE escrow_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE payout_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE disputes;