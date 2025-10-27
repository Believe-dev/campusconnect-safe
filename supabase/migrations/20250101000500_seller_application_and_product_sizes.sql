-- Add seller application reason to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_application_reason TEXT;

-- Add available sizes to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_sizes TEXT[];

-- Add selected size to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS selected_size TEXT;

-- Create seller applications table for tracking application history
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

-- Enable RLS on seller_applications
ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own applications" ON seller_applications;
DROP POLICY IF EXISTS "Users can create their own applications" ON seller_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON seller_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON seller_applications;

-- RLS policies for seller_applications
CREATE POLICY "Users can view their own applications" ON seller_applications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications" ON seller_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications" ON seller_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND account_type = 'admin'
        )
    );

CREATE POLICY "Admins can update applications" ON seller_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND account_type = 'admin'
        )
    );

-- Function to handle seller application approval
CREATE OR REPLACE FUNCTION approve_seller_application(
    application_id UUID,
    admin_response TEXT DEFAULT NULL
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
        status = 'approved',
        admin_response = COALESCE(admin_response, 'Your seller application has been approved! You can now purchase your monthly subscription to access seller features.'),
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = application_id;
    
    -- Update profile to seller with approved status (but no subscription yet)
    UPDATE profiles
    SET 
        account_type = 'seller',
        seller_status = 'approved',
        updated_at = NOW()
    WHERE user_id = app_user_id;
    
    -- Create notification
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
        app_user_id,
        'Seller Application Approved! 🎉',
        COALESCE(admin_response, 'Congratulations! Your seller application has been approved. You can now purchase your monthly subscription (₦1,000) to access all seller features.'),
        'success'
    );
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle seller application rejection
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

-- Update the existing handle_new_user function to not automatically set seller status
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
        seller_status
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, ''),
        COALESCE(full_name_val, COALESCE(NEW.email, 'User')),
        'buyer', -- Always start as buyer, they can apply to be seller
        university_val,
        campus_val,
        NULL
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;