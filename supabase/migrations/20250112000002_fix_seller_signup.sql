-- Fix the profile creation trigger to properly handle seller signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    account_type_val TEXT;
    university_val TEXT;
    campus_val TEXT;
    full_name_val TEXT;
BEGIN
    -- Extract metadata safely
    account_type_val := COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer');
    university_val := NEW.raw_user_meta_data->>'university_name';
    campus_val := NEW.raw_user_meta_data->>'campus';
    full_name_val := NEW.raw_user_meta_data->>'full_name';
    
    -- Insert profile with all signup data
    INSERT INTO public.profiles (
        user_id, 
        email, 
        full_name, 
        account_type,
        university_name,
        campus,
        verification_status
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, ''),
        COALESCE(full_name_val, COALESCE(NEW.email, 'User')),
        account_type_val,
        university_val,
        campus_val,
        CASE 
            WHEN account_type_val = 'seller' THEN 'pending'
            ELSE NULL
        END
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to notify user about approval timeline
CREATE OR REPLACE FUNCTION notify_seller_approval_timeline()
RETURNS TRIGGER AS $$
BEGIN
    -- Only for new seller registrations
    IF NEW.account_type IN ('seller', 'both') AND NEW.verification_status = 'pending' THEN
        -- Insert seller timeline notification
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (
            NEW.user_id,
            'Seller Application Submitted ⏳',
            'Your seller application has been submitted successfully! Our admin team will review your application within 3 working days. You''ll receive a notification once approved.',
            'info'
        );
        
        -- Notify admins (safely)
        INSERT INTO notifications (user_id, title, message, type)
        SELECT 
            p.user_id,
            'New Seller Application 📝',
            'A new seller has registered and needs approval. Check the admin panel to review their application.',
            'info'
        FROM profiles p
        JOIN user_roles ur ON p.user_id = ur.user_id
        WHERE ur.role = 'admin';
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail profile creation if notifications fail
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for seller approval timeline notification
DROP TRIGGER IF EXISTS seller_approval_timeline_trigger ON profiles;
CREATE TRIGGER seller_approval_timeline_trigger
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_seller_approval_timeline();