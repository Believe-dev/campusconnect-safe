-- Add seller_status column separate from verification
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_status TEXT CHECK (seller_status IN ('pending', 'approved', 'rejected')) DEFAULT NULL;

-- Update existing sellers to have pending status
UPDATE profiles 
SET seller_status = 'pending' 
WHERE account_type IN ('seller', 'both') AND seller_status IS NULL;

-- Update the seller approval functions
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
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;