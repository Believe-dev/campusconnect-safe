-- Update seller subscription pricing to 1000 naira per month
-- Remove daily subscription option and make monthly the default

-- Update existing subscription functions to use new pricing
CREATE OR REPLACE FUNCTION create_seller_subscription(
    p_user_id UUID,
    p_subscription_type TEXT DEFAULT 'monthly',
    p_payment_reference TEXT DEFAULT NULL,
    p_amount DECIMAL DEFAULT 1000.00
)
RETURNS UUID AS $$
DECLARE
    subscription_id UUID;
    expires_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Only allow monthly subscriptions now
    IF p_subscription_type != 'monthly' THEN
        RAISE EXCEPTION 'Only monthly subscriptions are allowed. Price: ₦1000 per month';
    END IF;
    
    -- Calculate expiration date (1 month from now)
    expires_date := NOW() + INTERVAL '1 month';
    
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
        'monthly',
        1000.00, -- Fixed price of 1000 naira
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
        seller_subscription_type = 'monthly',
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
        'Your monthly seller subscription (₦1,000) is now active. You can access all seller features for 30 days.',
        'subscription_activated',
        NOW()
    );
    
    RETURN subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update renewal function for new pricing
CREATE OR REPLACE FUNCTION renew_seller_subscription(
    p_user_id UUID,
    p_payment_reference TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    new_expires_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate new expiration date (extend by 1 month from current expiry or now, whichever is later)
    new_expires_date := GREATEST(
        COALESCE((SELECT seller_subscription_expires_at FROM profiles WHERE user_id = p_user_id), NOW()),
        NOW()
    ) + INTERVAL '1 month';
    
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
        'monthly',
        1000.00, -- Fixed price of 1000 naira
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
        seller_subscription_type = 'monthly',
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
        'Seller Subscription Renewed',
        'Your monthly seller subscription has been renewed for ₦1,000. Valid for another 30 days.',
        'subscription_renewed',
        NOW()
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get subscription days remaining for admin panel
CREATE OR REPLACE FUNCTION get_seller_subscription_days_remaining(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    expires_at TIMESTAMP WITH TIME ZONE;
    days_remaining INTEGER;
BEGIN
    SELECT seller_subscription_expires_at INTO expires_at
    FROM profiles 
    WHERE user_id = p_user_id;
    
    IF expires_at IS NULL THEN
        RETURN -1; -- No subscription
    END IF;
    
    days_remaining := EXTRACT(DAY FROM (expires_at - NOW()));
    
    -- Return 0 if expired, otherwise return days remaining
    RETURN GREATEST(0, days_remaining);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing active subscriptions to monthly pricing (one-time migration)
-- This will extend current subscriptions but update pricing for future renewals
UPDATE profiles 
SET 
    seller_subscription_type = 'monthly',
    updated_at = NOW()
WHERE (account_type = 'seller' OR account_type = 'both') 
AND seller_features_active = TRUE
AND seller_subscription_type = 'daily';

-- Update existing subscription records to reflect new pricing structure
UPDATE seller_subscriptions 
SET 
    subscription_type = 'monthly',
    updated_at = NOW()
WHERE subscription_type = 'daily' 
AND status = 'active';

-- Add index for better performance on subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_seller_subscription_expires_at 
ON profiles(seller_subscription_expires_at) 
WHERE seller_subscription_expires_at IS NOT NULL;

-- Create view for admin panel to easily see seller subscription status
CREATE OR REPLACE VIEW admin_seller_subscriptions AS
SELECT 
    p.user_id,
    p.full_name,
    p.email,
    p.university_name,
    p.seller_features_active,
    p.seller_subscription_expires_at,
    p.seller_subscription_type,
    p.seller_last_payment_date,
    CASE 
        WHEN p.seller_subscription_expires_at IS NULL THEN 'No Subscription'
        WHEN p.seller_subscription_expires_at <= NOW() THEN 'Expired'
        WHEN p.seller_subscription_expires_at <= NOW() + INTERVAL '7 days' THEN 'Expiring Soon'
        ELSE 'Active'
    END as subscription_status,
    CASE 
        WHEN p.seller_subscription_expires_at IS NULL THEN -1
        WHEN p.seller_subscription_expires_at <= NOW() THEN 0
        ELSE EXTRACT(DAY FROM (p.seller_subscription_expires_at - NOW()))::INTEGER
    END as days_remaining,
    (SELECT COUNT(*) FROM seller_subscriptions ss WHERE ss.user_id = p.user_id) as total_subscriptions,
    (SELECT SUM(amount) FROM seller_subscriptions ss WHERE ss.user_id = p.user_id AND ss.status = 'active') as total_paid
FROM profiles p
WHERE p.account_type IN ('seller', 'both')
ORDER BY 
    CASE 
        WHEN p.seller_subscription_expires_at IS NULL THEN 3
        WHEN p.seller_subscription_expires_at <= NOW() THEN 1
        WHEN p.seller_subscription_expires_at <= NOW() + INTERVAL '7 days' THEN 2
        ELSE 4
    END,
    p.seller_subscription_expires_at ASC NULLS LAST;

-- Grant access to admin view
GRANT SELECT ON admin_seller_subscriptions TO authenticated;

-- Function to extend seller subscription (admin only)
CREATE OR REPLACE FUNCTION extend_seller_subscription(
    p_user_id UUID,
    p_days INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    current_expires_at TIMESTAMP WITH TIME ZONE;
    new_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can extend subscriptions';
    END IF;
    
    -- Get current expiration date
    SELECT seller_subscription_expires_at INTO current_expires_at
    FROM profiles 
    WHERE user_id = p_user_id;
    
    -- Calculate new expiration date
    new_expires_at := GREATEST(
        COALESCE(current_expires_at, NOW()),
        NOW()
    ) + (p_days || ' days')::INTERVAL;
    
    -- Update profile
    UPDATE profiles 
    SET 
        seller_subscription_expires_at = new_expires_at,
        seller_features_active = TRUE,
        seller_subscription_type = 'monthly',
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
        'Subscription Extended',
        'Your seller subscription has been extended by ' || p_days || ' days by an administrator.',
        'subscription_extended',
        NOW()
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policy for admin view
CREATE POLICY "Admins can view seller subscriptions" ON admin_seller_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );