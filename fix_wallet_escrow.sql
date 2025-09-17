-- Fix wallet system and auto-release escrow funds

-- 1. Drop existing function and recreate with correct return type
DROP FUNCTION IF EXISTS release_escrow_funds(UUID);

CREATE FUNCTION release_escrow_funds(escrow_id UUID)
RETURNS VOID AS $$
DECLARE
    escrow_record RECORD;
BEGIN
    -- Get escrow transaction details
    SELECT * INTO escrow_record
    FROM escrow_transactions
    WHERE id = escrow_id AND status = 'held';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Escrow transaction not found or already released';
    END IF;
    
    -- Update escrow status to released
    UPDATE escrow_transactions
    SET 
        status = 'released',
        released_at = NOW()
    WHERE id = escrow_id;
    
    -- Add funds to seller's wallet
    INSERT INTO wallet_transactions (
        wallet_id,
        amount,
        transaction_type,
        description,
        reference_id
    ) VALUES (
        (SELECT id FROM wallets WHERE user_id = escrow_record.seller_id),
        escrow_record.seller_amount,
        'credit',
        'Escrow funds released for order',
        escrow_record.order_id::text
    );
    
    -- Update wallet balance
    UPDATE wallets
    SET balance = balance + escrow_record.seller_amount
    WHERE user_id = escrow_record.seller_id;
    
    -- Mark order as escrow released
    UPDATE orders
    SET escrow_released = true
    WHERE id = escrow_record.order_id;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create function to auto-release escrow after 7 days
CREATE OR REPLACE FUNCTION auto_release_escrow()
RETURNS VOID AS $$
DECLARE
    escrow_record RECORD;
BEGIN
    -- Find escrow transactions that should be auto-released
    FOR escrow_record IN
        SELECT et.id
        FROM escrow_transactions et
        JOIN orders o ON et.order_id = o.id
        WHERE et.status = 'held'
        AND o.status = 'delivered'
        AND et.auto_release_at <= NOW()
    LOOP
        -- Release the escrow
        PERFORM release_escrow_funds(escrow_record.id);
        
        -- Update order status to confirmed
        UPDATE orders
        SET 
            status = 'confirmed',
            confirmed_at = NOW()
        WHERE id = (
            SELECT order_id FROM escrow_transactions WHERE id = escrow_record.id
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create wallet tables if they don't exist
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
    description TEXT,
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS on wallet tables
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Create wallet policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'wallets' 
        AND policyname = 'Users can view their own wallet'
    ) THEN
        CREATE POLICY "Users can view their own wallet" ON wallets
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'wallet_transactions' 
        AND policyname = 'Users can view their own transactions'
    ) THEN
        CREATE POLICY "Users can view their own transactions" ON wallet_transactions
            FOR SELECT USING (
                wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
            );
    END IF;
END $$;

-- 6. Create trigger to update order status when confirmed
CREATE OR REPLACE FUNCTION handle_order_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    -- If order is being confirmed, release escrow funds
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
        -- Find and release escrow
        PERFORM release_escrow_funds(et.id)
        FROM escrow_transactions et
        WHERE et.order_id = NEW.id AND et.status = 'held';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_confirmation ON orders;
CREATE TRIGGER on_order_confirmation
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_confirmation();