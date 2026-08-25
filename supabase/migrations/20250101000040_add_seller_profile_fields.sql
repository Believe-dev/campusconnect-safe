-- Add department and business_name columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS business_name TEXT;

-- Update the handle_new_user function to include the new fields
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
BEGIN
    -- Extract all metadata from signup
    account_type_val := COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer');
    university_val := NEW.raw_user_meta_data->>'university_name';
    full_name_val := NEW.raw_user_meta_data->>'full_name';
    student_id_val := NEW.raw_user_meta_data->>'student_id';
    phone_number_val := NEW.raw_user_meta_data->>'phone_number';
    department_val := NEW.raw_user_meta_data->>'department';
    business_name_val := NEW.raw_user_meta_data->>'business_name';
    
    -- Insert complete profile with all signup data
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
        seller_status
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, ''),
        COALESCE(full_name_val, COALESCE(NEW.email, 'User')),
        account_type_val,
        university_val,
        student_id_val,
        phone_number_val,
        department_val,
        business_name_val,
        CASE 
            WHEN account_type_val = 'seller' THEN 'pending'
            ELSE NULL  -- Buyers don't need seller approval
        END
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;