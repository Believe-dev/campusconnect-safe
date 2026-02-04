-- Enable the trigger back - Run this in Supabase SQL Editor

-- Create the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile with signup data
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
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer'),
        NEW.raw_user_meta_data->>'university_name',
        NEW.raw_user_meta_data->>'student_id',
        NEW.raw_user_meta_data->>'phone_number',
        CASE WHEN COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer') = 'seller' THEN 'pending' ELSE NULL END
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();