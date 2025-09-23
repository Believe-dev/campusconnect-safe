-- Fix user_roles RLS policies to allow seller role assignment

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own seller role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Create comprehensive RLS policies for user_roles
CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own seller role" ON user_roles
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        role = 'seller'
    );

CREATE POLICY "Admins can manage all roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

-- Ensure RLS is enabled
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create function to safely assign seller role
CREATE OR REPLACE FUNCTION assign_seller_role(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow users to assign seller role to themselves
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Cannot assign role to another user';
    END IF;
    
    -- Insert seller role if it doesn't exist
    INSERT INTO user_roles (user_id, role)
    VALUES (p_user_id, 'seller')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Update profile account_type
    UPDATE profiles 
    SET account_type = CASE 
        WHEN account_type = 'buyer' THEN 'seller'
        WHEN account_type = 'seller' THEN 'seller'
        ELSE 'both'
    END,
    seller_status = 'pending'
    WHERE user_id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION assign_seller_role TO authenticated;