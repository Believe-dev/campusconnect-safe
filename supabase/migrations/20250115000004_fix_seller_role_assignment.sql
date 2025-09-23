-- Update the handle_new_user function to properly assign seller roles
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
    
    -- Insert profile with all signup data
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
        account_type_val,
        university_val,
        campus_val,
        CASE 
            WHEN account_type_val = 'seller' THEN 'pending'
            ELSE NULL
        END
    );
    
    -- Assign user role based on account type
    IF account_type_val = 'seller' THEN
        -- Insert seller role using SECURITY DEFINER to bypass RLS
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'seller');
    ELSE
        -- Insert buyer role using SECURITY DEFINER to bypass RLS
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'buyer');
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for users to upgrade to seller (for existing buyers)
CREATE OR REPLACE FUNCTION upgrade_to_seller()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Insert seller role if it doesn't exist
    INSERT INTO user_roles (user_id, role)
    VALUES (current_user_id, 'seller')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Update profile account_type and seller_status
    UPDATE profiles 
    SET account_type = CASE 
        WHEN account_type = 'buyer' THEN 'seller'
        ELSE 'both'
    END,
    seller_status = 'pending'
    WHERE user_id = current_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upgrade_to_seller TO authenticated;