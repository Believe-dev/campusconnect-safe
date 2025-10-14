-- COMPLETE DATABASE FIX - Run this in Supabase SQL Editor

-- First, create all missing tables that might be referenced
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    available_balance DECIMAL(10,2) DEFAULT 0.00,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    total_commission_paid DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Add missing columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_subscription_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_features_active BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_registration_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_registration_paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS university_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Drop existing trigger to recreate it properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the proper handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    account_type_val TEXT;
    university_val TEXT;
    full_name_val TEXT;
    student_id_val TEXT;
    phone_number_val TEXT;
BEGIN
    -- Extract metadata safely
    account_type_val := COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer');
    university_val := NEW.raw_user_meta_data->>'university_name';
    full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', COALESCE(NEW.email, 'User'));
    student_id_val := NEW.raw_user_meta_data->>'student_id';
    phone_number_val := NEW.raw_user_meta_data->>'phone_number';
    
    -- Insert profile
    INSERT INTO public.profiles (
        user_id, 
        email, 
        full_name, 
        account_type,
        university_name,
        student_id,
        phone_number,
        seller_status
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, ''),
        full_name_val,
        account_type_val,
        university_val,
        student_id_val,
        phone_number_val,
        CASE WHEN account_type_val = 'seller' THEN 'pending' ELSE NULL END
    );
    
    -- Create wallet
    INSERT INTO wallets (user_id, available_balance, total_earnings, total_commission_paid)
    VALUES (NEW.id, 0.00, 0.00, 0.00);
    
    -- Create notification preferences
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on new tables
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their notification preferences" ON notification_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their wallet" ON wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their notifications" ON notifications
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);