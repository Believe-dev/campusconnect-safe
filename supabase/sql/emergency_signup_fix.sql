-- Emergency fix for signup database error
-- Run this immediately in Supabase SQL Editor

-- Create notification_preferences table if missing
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    order_updates BOOLEAN DEFAULT true,
    message_notifications BOOLEAN DEFAULT true,
    payment_notifications BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    seller_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add missing profile columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_registration_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_registration_paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_subscription_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_features_active BOOLEAN DEFAULT FALSE;

-- Drop conflicting triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_notification_preferences_trigger ON auth.users;

-- Simple handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create profile if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = NEW.id) THEN
        INSERT INTO profiles (
            user_id, 
            email, 
            full_name, 
            account_type,
            university_name,
            student_id,
            phone_number,
            seller_status
        ) VALUES (
            NEW.id, 
            COALESCE(NEW.email, ''),
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
            COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer'),
            NEW.raw_user_meta_data->>'university_name',
            NEW.raw_user_meta_data->>'student_id',
            NEW.raw_user_meta_data->>'phone_number',
            CASE WHEN COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer') = 'seller' THEN 'pending' ELSE NULL END
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();