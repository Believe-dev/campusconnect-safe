-- Create trigger to automatically activate seller subscriptions
CREATE OR REPLACE FUNCTION auto_activate_seller_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- Only for sellers who have paid registration
    IF NEW.account_type = 'seller' AND NEW.seller_registration_paid = TRUE THEN
        -- Set subscription fields
        NEW.seller_subscription_expires_at := NOW() + INTERVAL '30 days';
        NEW.seller_features_active := TRUE;
        NEW.seller_subscription_type := 'monthly';
        NEW.seller_last_payment_date := NOW();
        
        -- Insert subscription record
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
            'auto_' || gen_random_uuid()::text,
            NOW(),
            NOW() + INTERVAL '30 days',
            'active'
        ) ON CONFLICT (user_id, payment_reference) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires on INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_auto_activate_seller_subscription ON profiles;
CREATE TRIGGER trigger_auto_activate_seller_subscription
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_activate_seller_subscription();