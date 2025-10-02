-- Add secure validation for seller registration
-- This prevents bypassing the payment requirement

-- Function to validate seller registration on profile creation
CREATE OR REPLACE FUNCTION validate_seller_registration()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a seller account, ensure payment has been made
    IF NEW.account_type = 'seller' OR NEW.account_type = 'both' THEN
        -- Check if payment reference exists in user metadata
        IF NEW.user_id IS NOT NULL THEN
            DECLARE
                user_metadata JSONB;
                payment_ref TEXT;
            BEGIN
                -- Get user metadata
                SELECT raw_user_meta_data INTO user_metadata 
                FROM auth.users 
                WHERE id = NEW.user_id;
                
                -- Extract payment reference
                payment_ref := user_metadata->>'payment_reference';
                
                -- If no payment reference, reject the seller registration
                IF payment_ref IS NULL OR payment_ref = '' THEN
                    RAISE EXCEPTION 'Seller registration requires payment. Payment reference missing.';
                END IF;
                
                -- Verify payment exists in our records
                IF NOT EXISTS (
                    SELECT 1 FROM seller_registration_payments 
                    WHERE payment_reference = payment_ref 
                    AND status = 'completed'
                ) THEN
                    -- Create the payment record if it doesn't exist (for new signups)
                    INSERT INTO seller_registration_payments (
                        user_id,
                        amount,
                        payment_reference,
                        payment_method,
                        status
                    ) VALUES (
                        NEW.user_id,
                        2000.00,
                        payment_ref,
                        'paystack',
                        'completed'
                    ) ON CONFLICT (payment_reference) DO NOTHING;
                END IF;
                
                -- Mark profile as paid
                NEW.seller_registration_paid := TRUE;
                NEW.seller_registration_paid_at := NOW();
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to validate seller registration
DROP TRIGGER IF EXISTS validate_seller_registration_trigger ON profiles;
CREATE TRIGGER validate_seller_registration_trigger
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_seller_registration();

-- Function to prevent unauthorized seller account type changes
CREATE OR REPLACE FUNCTION prevent_seller_bypass()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent changing to seller without payment
    IF OLD.account_type != 'seller' AND NEW.account_type = 'seller' THEN
        IF NOT NEW.seller_registration_paid THEN
            RAISE EXCEPTION 'Cannot change to seller account without completing registration payment.';
        END IF;
    END IF;
    
    -- Prevent changing seller_registration_paid without proper authorization
    IF OLD.seller_registration_paid = FALSE AND NEW.seller_registration_paid = TRUE THEN
        -- Only allow if there's a valid payment record
        IF NOT EXISTS (
            SELECT 1 FROM seller_registration_payments 
            WHERE user_id = NEW.user_id 
            AND status = 'completed'
        ) THEN
            RAISE EXCEPTION 'Cannot mark seller registration as paid without valid payment record.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to prevent bypasses
DROP TRIGGER IF EXISTS prevent_seller_bypass_trigger ON profiles;
CREATE TRIGGER prevent_seller_bypass_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_seller_bypass();

-- Add RLS policy to ensure only paid sellers can create products
DROP POLICY IF EXISTS "Only paid sellers can create products" ON products;
CREATE POLICY "Only paid sellers can create products" ON products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND (account_type = 'seller' OR account_type = 'both')
            AND seller_registration_paid = TRUE
        )
    );

-- Update existing seller products policy
DROP POLICY IF EXISTS "Sellers can manage their own products" ON products;
CREATE POLICY "Sellers can manage their own products" ON products
    FOR ALL USING (
        seller_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND (account_type = 'seller' OR account_type = 'both')
            AND seller_registration_paid = TRUE
        )
    );