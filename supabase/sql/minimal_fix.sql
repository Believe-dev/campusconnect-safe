-- MINIMAL FIX - Run this step by step in Supabase SQL Editor

-- Step 1: Disable the trigger completely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Test signup now (should work without trigger)
-- Try signing up after running just this step

-- Step 3: If signup works without trigger, then run this minimal function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Minimal profile creation - only required fields
    INSERT INTO public.profiles (user_id, email, full_name, account_type)
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer')
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Re-enable trigger only after confirming signup works
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();