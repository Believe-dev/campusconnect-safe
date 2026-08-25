-- CRITICAL FIX: Phone number and matric number not saving during signup
-- Run this SQL in your Supabase SQL Editor to fix the issue

-- Drop existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the corrected handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    account_type_val TEXT;
    university_val TEXT;
    full_name_val TEXT;
    student_id_val TEXT;
    phone_number_val TEXT;
    department_val TEXT;
    business_name_val TEXT;
    payment_reference_val TEXT;
    profile_exists BOOLEAN := FALSE;
BEGIN
    -- Check if profile already exists to prevent duplicates
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = NEW.id) INTO profile_exists;
    
    IF profile_exists THEN
        RETURN NEW;
    END IF;
    
    -- Extract all metadata from signup with safe defaults
    account_type_val := COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer');
    university_val := NEW.raw_user_meta_data->>'university_name';
    full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(COALESCE(NEW.email, 'User'), '@', 1));
    student_id_val := NEW.raw_user_meta_data->>'student_id';
    phone_number_val := NEW.raw_user_meta_data->>'phone_number';
    department_val := NEW.raw_user_meta_data->>'department';
    business_name_val := NEW.raw_user_meta_data->>'business_name';
    payment_reference_val := NEW.raw_user_meta_data->>'payment_reference';
    
    -- Insert complete profile with all signup data including phone_number and student_id
    INSERT INTO public.profiles (
        user_id, 
        email, 
        full_name, 
        account_type,
        university_name,
        student_id,
        phone_number,
        department,
        business_name,
        seller_status,
        seller_registration_paid,
        seller_features_active
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, ''),
        full_name_val,
        account_type_val,
        university_val,
        student_id_val,
        phone_number_val,
        department_val,
        business_name_val,
        CASE 
            WHEN account_type_val = 'seller' THEN 'pending'
            ELSE NULL
        END,
        FALSE,
        FALSE
    );
    
    -- Create wallet for the user
    BEGIN
        INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings, total_commission_paid)
        VALUES (NEW.id, 0.00, 0.00, 0.00, 0.00)
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log warning but don't fail user creation
            NULL;
    END;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();