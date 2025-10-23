-- Fix seller subscription function ON CONFLICT error

-- First, ensure seller_subscriptions table has proper unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'seller_subscriptions_user_payment_unique'
    ) THEN
        ALTER TABLE seller_subscriptions 
        ADD CONSTRAINT seller_subscriptions_user_payment_unique 
        UNIQUE (user_id, payment_reference);
    END IF;
END $$;

-- Fix the auto_activate_seller_subscription function
CREATE OR REPLACE FUNCTION auto_activate_seller_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- Only activate subscription for approved sellers
    IF NEW.seller_status = 'approved' AND (OLD.seller_status IS NULL OR OLD.seller_status != 'approved') THEN
        -- Check if user already has an active subscription
        IF NOT EXISTS (
            SELECT 1 FROM seller_subscriptions 
            WHERE user_id = NEW.user_id 
            AND status = 'active' 
            AND expires_at > NOW()
        ) THEN
            -- Create new subscription with unique payment reference
            INSERT INTO seller_subscriptions (
                user_id,
                subscription_type,
                amount,
                payment_reference,
                starts_at,
                expires_at,
                status
            ) VALUES (
                NEW.user_id,
                'monthly',
                1000.00,
                'auto_' || NEW.user_id || '_' || extract(epoch from NOW())::text,
                NOW(),
                NOW() + INTERVAL '30 days',
                'active'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;