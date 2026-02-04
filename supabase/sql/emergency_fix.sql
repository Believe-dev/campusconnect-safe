-- EMERGENCY FIX: Run this immediately in Supabase SQL Editor

-- Drop all existing triggers that might be causing issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS notify_seller_timeline ON profiles;
DROP TRIGGER IF EXISTS seller_approval_timeline_trigger ON profiles;

-- Create the absolute minimal function that cannot fail
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Do nothing - let user creation succeed
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable with minimal trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profiles manually after signup works
-- This allows signup to work immediately