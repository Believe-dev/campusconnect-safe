-- Fix profile update functions to handle existing users properly
-- This specifically addresses issues when editing user details or extending subscriptions

-- Create a safe function to update user profiles
CREATE OR REPLACE FUNCTION update_user_profile(
    p_user_id UUID,
    p_full_name TEXT DEFAULT NULL,
    p_phone_number TEXT DEFAULT NULL,
    p_university_name TEXT DEFAULT NULL,
    p_student_id TEXT DEFAULT NULL,
    p_bio TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update only the provided fields
    UPDATE profiles 
    SET 
        full_name = COALESCE(p_full_name, full_name),
        phone_number = COALESCE(p_phone_number, phone_number),
        university_name = COALESCE(p_university_name, university_name),
        student_id = COALESCE(p_student_id, student_id),
        bio = COALESCE(p_bio, bio),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to update profile for user %: %', p_user_id, SQLERRM;
        RETURN FALSE;
END;
$$;

-- Create a safe function to extend seller subscription
CREATE OR REPLACE FUNCTION extend_seller_subscription(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_expiry TIMESTAMP WITH TIME ZONE;
    new_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current expiry date
    SELECT seller_subscription_expires_at INTO current_expiry
    FROM profiles 
    WHERE user_id = p_user_id;
    
    -- Calculate new expiry date
    IF current_expiry IS NULL OR current_expiry < NOW() THEN
        -- If no expiry or already expired, start from now
        new_expiry := NOW() + (p_days || ' days')::INTERVAL;
    ELSE
        -- If still active, extend from current expiry
        new_expiry := current_expiry + (p_days || ' days')::INTERVAL;
    END IF;
    
    -- Update the subscription
    UPDATE profiles 
    SET 
        seller_subscription_expires_at = new_expiry,
        seller_features_active = TRUE,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Ensure user has a wallet
    IF NOT EXISTS (SELECT 1 FROM wallets WHERE user_id = p_user_id) THEN
        INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings, total_commission_paid)
        VALUES (p_user_id, 0.00, 0.00, 0.00, 0.00);
    END IF;
    
    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to extend subscription for user %: %', p_user_id, SQLERRM;
        RETURN FALSE;
END;
$$;

-- Create a safe function to activate seller features
CREATE OR REPLACE FUNCTION activate_seller_features(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update seller status and activate features
    UPDATE profiles 
    SET 
        seller_status = 'approved',
        seller_features_active = TRUE,
        verification_status = 'approved',
        verified_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Ensure user has seller role
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'seller') THEN
        INSERT INTO user_roles (user_id, role)
        VALUES (p_user_id, 'seller');
    END IF;
    
    -- Ensure user has a wallet
    IF NOT EXISTS (SELECT 1 FROM wallets WHERE user_id = p_user_id) THEN
        INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings, total_commission_paid)
        VALUES (p_user_id, 0.00, 0.00, 0.00, 0.00);
    END IF;
    
    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to activate seller features for user %: %', p_user_id, SQLERRM;
        RETURN FALSE;
END;
$$;

-- Create a safe function to update seller subscription payment
CREATE OR REPLACE FUNCTION update_seller_subscription_payment(
    p_user_id UUID,
    p_payment_reference TEXT,
    p_amount DECIMAL(10,2) DEFAULT 5000.00
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update profile with payment info
    UPDATE profiles 
    SET 
        seller_registration_paid = TRUE,
        seller_registration_paid_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Record the payment if seller_registration_payments table exists
    BEGIN
        INSERT INTO seller_registration_payments (
            user_id, 
            amount, 
            payment_reference, 
            payment_method, 
            status
        )
        VALUES (
            p_user_id, 
            p_amount, 
            p_payment_reference, 
            'paystack', 
            'completed'
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Table might not exist, just log warning
            RAISE WARNING 'Could not record payment for user %: %', p_user_id, SQLERRM;
    END;
    
    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to update subscription payment for user %: %', p_user_id, SQLERRM;
        RETURN FALSE;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION extend_seller_subscription(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_seller_features(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_seller_subscription_payment(UUID, TEXT, DECIMAL) TO authenticated;

-- Grant execute permissions to service role for admin functions
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION extend_seller_subscription(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION activate_seller_features(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION update_seller_subscription_payment(UUID, TEXT, DECIMAL) TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION update_user_profile IS 'Safely update user profile fields without ON CONFLICT issues';
COMMENT ON FUNCTION extend_seller_subscription IS 'Safely extend seller subscription without ON CONFLICT issues';
COMMENT ON FUNCTION activate_seller_features IS 'Safely activate seller features without ON CONFLICT issues';
COMMENT ON FUNCTION update_seller_subscription_payment IS 'Safely record seller subscription payment without ON CONFLICT issues';