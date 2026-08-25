-- Add seller subscription fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS seller_subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS seller_features_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seller_subscription_type TEXT DEFAULT 'daily' CHECK (seller_subscription_type IN ('daily', 'monthly')),
ADD COLUMN IF NOT EXISTS seller_last_payment_date TIMESTAMP WITH TIME ZONE;

-- Create seller_subscriptions table for tracking subscription history
CREATE TABLE IF NOT EXISTS seller_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_type TEXT NOT NULL DEFAULT 'daily' CHECK (subscription_type IN ('daily', 'monthly')),
    amount DECIMAL(10,2) NOT NULL,
    payment_reference TEXT NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_seller_subscriptions_user_id ON seller_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_subscriptions_expires_at ON seller_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_seller_subscriptions_status ON seller_subscriptions(status);

-- Enable RLS
ALTER TABLE seller_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own subscriptions" ON seller_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON seller_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON seller_subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Function to check and disable expired seller subscriptions
CREATE OR REPLACE FUNCTION check_expired_seller_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
    subscription_record RECORD;
BEGIN
    -- Update expired subscriptions
    UPDATE seller_subscriptions 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' AND expires_at <= NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Disable seller features for users with expired subscriptions
    UPDATE profiles 
    SET 
        seller_features_active = FALSE,
        updated_at = NOW()
    WHERE user_id IN (
        SELECT DISTINCT user_id 
        FROM seller_subscriptions 
        WHERE status = 'expired' 
        AND expires_at <= NOW()
        AND user_id NOT IN (
            SELECT user_id 
            FROM seller_subscriptions 
            WHERE status = 'active' AND expires_at > NOW()
        )
    );
    
    -- Log expired subscriptions for notification
    FOR subscription_record IN 
        SELECT s.user_id, p.email, p.full_name, s.expires_at
        FROM seller_subscriptions s
        JOIN profiles p ON s.user_id = p.user_id
        WHERE s.status = 'expired' 
        AND s.expires_at::date = CURRENT_DATE
    LOOP
        -- Insert notification for expired subscription
        INSERT INTO notifications (
            user_id, 
            title, 
            message, 
            type,
            created_at
        ) VALUES (
            subscription_record.user_id,
            'Seller Subscription Expired',
            'Your seller subscription has expired. Renew now to continue accessing seller features.',
            'subscription_expired',
            NOW()
        );
    END LOOP;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new seller subscription
CREATE OR REPLACE FUNCTION create_seller_subscription(
    p_user_id UUID,
    p_subscription_type TEXT DEFAULT 'daily',
    p_payment_reference TEXT DEFAULT NULL,
    p_amount DECIMAL DEFAULT 100.00
)
RETURNS UUID AS $$
DECLARE
    subscription_id UUID;
    expires_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate expiration date based on subscription type
    IF p_subscription_type = 'daily' THEN
        expires_date := NOW() + INTERVAL '1 day';
    ELSIF p_subscription_type = 'monthly' THEN
        expires_date := NOW() + INTERVAL '1 month';
    ELSE
        RAISE EXCEPTION 'Invalid subscription type: %', p_subscription_type;
    END IF;
    
    -- Create subscription record
    INSERT INTO seller_subscriptions (
        user_id,
        subscription_type,
        amount,
        payment_reference,
        starts_at,
        expires_at,
        status
    ) VALUES (
        p_user_id,
        p_subscription_type,
        p_amount,
        COALESCE(p_payment_reference, 'manual_' || gen_random_uuid()::text),
        NOW(),
        expires_date,
        'active'
    ) RETURNING id INTO subscription_id;
    
    -- Update profile with subscription info
    UPDATE profiles 
    SET 
        seller_subscription_expires_at = expires_date,
        seller_features_active = TRUE,
        seller_subscription_type = p_subscription_type,
        seller_last_payment_date = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Create notification
    INSERT INTO notifications (
        user_id, 
        title, 
        message, 
        type,
        created_at
    ) VALUES (
        p_user_id,
        'Seller Subscription Activated',
        'Your seller subscription is now active. You can access all seller features.',
        'subscription_activated',
        NOW()
    );
    
    RETURN subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to renew seller subscription
CREATE OR REPLACE FUNCTION renew_seller_subscription(
    p_user_id UUID,
    p_payment_reference TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    current_subscription RECORD;
    new_expires_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current subscription info
    SELECT subscription_type INTO current_subscription
    FROM profiles 
    WHERE user_id = p_user_id;
    
    -- Calculate new expiration date
    IF current_subscription.subscription_type = 'daily' THEN
        new_expires_date := GREATEST(
            COALESCE((SELECT seller_subscription_expires_at FROM profiles WHERE user_id = p_user_id), NOW()),
            NOW()
        ) + INTERVAL '1 day';
    ELSE
        new_expires_date := GREATEST(
            COALESCE((SELECT seller_subscription_expires_at FROM profiles WHERE user_id = p_user_id), NOW()),
            NOW()
        ) + INTERVAL '1 month';
    END IF;
    
    -- Create new subscription record
    INSERT INTO seller_subscriptions (
        user_id,
        subscription_type,
        amount,
        payment_reference,
        starts_at,
        expires_at,
        status
    ) VALUES (
        p_user_id,
        COALESCE(current_subscription.subscription_type, 'daily'),
        CASE WHEN COALESCE(current_subscription.subscription_type, 'daily') = 'daily' THEN 100.00 ELSE 2000.00 END,
        p_payment_reference,
        NOW(),
        new_expires_date,
        'active'
    );
    
    -- Update profile
    UPDATE profiles 
    SET 
        seller_subscription_expires_at = new_expires_date,
        seller_features_active = TRUE,
        seller_last_payment_date = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if seller features are active
CREATE OR REPLACE FUNCTION is_seller_features_active(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    features_active BOOLEAN := FALSE;
BEGIN
    SELECT seller_features_active INTO features_active
    FROM profiles 
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(features_active, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing seller profiles to have active subscriptions (one-time migration)
UPDATE profiles 
SET 
    seller_subscription_expires_at = NOW() + INTERVAL '30 days',
    seller_features_active = TRUE,
    seller_subscription_type = 'daily',
    seller_last_payment_date = NOW()
WHERE (account_type = 'seller' OR account_type = 'both') 
AND seller_registration_paid = TRUE
AND seller_subscription_expires_at IS NULL;

-- Enable realtime for new table
ALTER TABLE seller_subscriptions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE seller_subscriptions;

-- Create a trigger to automatically check subscription status on profile updates
CREATE OR REPLACE FUNCTION update_seller_features_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if subscription has expired
    IF NEW.seller_subscription_expires_at IS NOT NULL AND NEW.seller_subscription_expires_at <= NOW() THEN
        NEW.seller_features_active := FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_seller_subscription_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.seller_subscription_expires_at IS DISTINCT FROM NEW.seller_subscription_expires_at)
    EXECUTE FUNCTION update_seller_features_status();