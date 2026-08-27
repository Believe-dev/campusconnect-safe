-- Fix seller applications table and subscription system integration
-- This migration ensures proper seller application workflow with subscription creation

-- Ensure seller_applications table exists with proper structure
CREATE TABLE IF NOT EXISTS seller_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    admin_response TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure seller_subscriptions table exists
CREATE TABLE IF NOT EXISTS seller_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_type TEXT DEFAULT 'monthly',
    amount DECIMAL(10,2) DEFAULT 1000.00,
    payment_reference TEXT,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add subscription-related columns to profiles if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS seller_subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS seller_features_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seller_subscription_type TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS seller_last_payment_date TIMESTAMP WITH TIME ZONE;

-- Enable RLS on both tables
ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for seller_applications
DROP POLICY IF EXISTS "Users can view their own applications" ON seller_applications;
CREATE POLICY "Users can view their own applications" ON seller_applications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own applications" ON seller_applications;
CREATE POLICY "Users can create their own applications" ON seller_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all applications" ON seller_applications;
CREATE POLICY "Admins can view all applications" ON seller_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can update applications" ON seller_applications;
CREATE POLICY "Admins can update applications" ON seller_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS policies for seller_subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON seller_subscriptions;
CREATE POLICY "Users can view their own subscriptions" ON seller_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON seller_subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON seller_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "System can manage subscriptions" ON seller_subscriptions;
CREATE POLICY "System can manage subscriptions" ON seller_subscriptions
    FOR ALL USING (true);

-- Update the approve_seller_application function to integrate with subscription system
CREATE OR REPLACE FUNCTION approve_seller_application(
    application_id UUID,
    admin_response TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    app_user_id UUID;
    user_email TEXT;
    user_name TEXT;
    subscription_id UUID;
BEGIN
    -- Get application details
    SELECT user_id INTO app_user_id
    FROM seller_applications
    WHERE id = application_id;
    
    IF app_user_id IS NULL THEN
        RAISE EXCEPTION 'Application not found';
    END IF;
    
    -- Get user details
    SELECT email, full_name INTO user_email, user_name
    FROM profiles
    WHERE user_id = app_user_id;
    
    -- Update application status
    UPDATE seller_applications
    SET 
        status = 'approved',
        admin_response = COALESCE(admin_response, 'Your seller application has been approved! You now have access to all seller features with a monthly subscription.'),
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = application_id;
    
    -- Create seller subscription (₦1000 monthly)
    INSERT INTO seller_subscriptions (
        user_id,
        subscription_type,
        amount,
        payment_reference,
        starts_at,
        expires_at,
        status
    ) VALUES (
        app_user_id,
        'monthly',
        1000.00,
        'admin_approval_' || application_id::text,
        NOW(),
        NOW() + INTERVAL '1 month',
        'active'
    ) RETURNING id INTO subscription_id;
    
    -- Update profile to seller with subscription details
    UPDATE profiles
    SET 
        account_type = 'seller',
        seller_status = 'approved',
        seller_subscription_expires_at = NOW() + INTERVAL '1 month',
        seller_features_active = TRUE,
        seller_subscription_type = 'monthly',
        seller_last_payment_date = NOW(),
        updated_at = NOW()
    WHERE user_id = app_user_id;
    
    -- Create notification
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
        app_user_id,
        'Seller Application Approved! 🎉',
        COALESCE(admin_response, 'Congratulations! Your seller application has been approved and your monthly subscription (₦1,000) is now active. You can start listing products immediately and have full access to all seller features for 30 days.'),
        'success'
    );
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the reject_seller_application function
CREATE OR REPLACE FUNCTION reject_seller_application(
    application_id UUID,
    admin_response TEXT
)
RETURNS VOID AS $$
DECLARE
    app_user_id UUID;
    user_email TEXT;
    user_name TEXT;
BEGIN
    -- Get application details
    SELECT user_id INTO app_user_id
    FROM seller_applications
    WHERE id = application_id;
    
    IF app_user_id IS NULL THEN
        RAISE EXCEPTION 'Application not found';
    END IF;
    
    -- Get user details
    SELECT email, full_name INTO user_email, user_name
    FROM profiles
    WHERE user_id = app_user_id;
    
    -- Update application status
    UPDATE seller_applications
    SET 
        status = 'rejected',
        admin_response = admin_response,
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = application_id;
    
    -- Keep user as buyer, update seller status
    UPDATE profiles
    SET 
        seller_status = 'rejected',
        updated_at = NOW()
    WHERE user_id = app_user_id;
    
    -- Create notification
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
        app_user_id,
        'Seller Application Update',
        admin_response,
        'warning'
    );
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or update the create_seller_subscription function
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
        'success',
        NOW()
    );
    
    RETURN subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_seller_applications_status ON seller_applications(status);
CREATE INDEX IF NOT EXISTS idx_seller_applications_user_id ON seller_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_subscriptions_user_id ON seller_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_subscriptions_expires_at ON seller_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_seller_subscription_expires_at ON profiles(seller_subscription_expires_at) WHERE seller_subscription_expires_at IS NOT NULL;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON seller_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON seller_subscriptions TO authenticated;

-- Create a function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_seller_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = p_user_id 
        AND seller_features_active = TRUE 
        AND seller_subscription_expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get subscription status for a user
CREATE OR REPLACE FUNCTION get_seller_subscription_status(p_user_id UUID)
RETURNS TABLE (
    has_subscription BOOLEAN,
    expires_at TIMESTAMP WITH TIME ZONE,
    days_remaining INTEGER,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN p.seller_subscription_expires_at IS NOT NULL AND p.seller_subscription_expires_at > NOW() 
            THEN TRUE 
            ELSE FALSE 
        END as has_subscription,
        p.seller_subscription_expires_at as expires_at,
        CASE 
            WHEN p.seller_subscription_expires_at IS NULL THEN -1
            WHEN p.seller_subscription_expires_at <= NOW() THEN 0
            ELSE EXTRACT(DAY FROM (p.seller_subscription_expires_at - NOW()))::INTEGER
        END as days_remaining,
        CASE 
            WHEN p.seller_subscription_expires_at IS NULL THEN 'No Subscription'
            WHEN p.seller_subscription_expires_at <= NOW() THEN 'Expired'
            WHEN p.seller_subscription_expires_at <= NOW() + INTERVAL '7 days' THEN 'Expiring Soon'
            ELSE 'Active'
        END as status
    FROM profiles p
    WHERE p.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the handle_new_user function to ensure proper initialization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    account_type_val TEXT;
    university_val TEXT;
    campus_val TEXT;
    full_name_val TEXT;
BEGIN
    account_type_val := COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer');
    university_val := NEW.raw_user_meta_data->>'university_name';
    campus_val := NEW.raw_user_meta_data->>'campus';
    full_name_val := NEW.raw_user_meta_data->>'full_name';
    
    INSERT INTO public.profiles (
        user_id, 
        email, 
        full_name, 
        account_type,
        university_name,
        campus,
        seller_status,
        seller_features_active,
        seller_subscription_type
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, ''),
        COALESCE(full_name_val, COALESCE(NEW.email, 'User')),
        'buyer', -- Always start as buyer, they can apply to be seller
        university_val,
        campus_val,
        NULL,
        FALSE,
        'monthly'
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;