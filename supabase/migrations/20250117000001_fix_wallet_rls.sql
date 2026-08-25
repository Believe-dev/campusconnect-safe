-- Fix wallet RLS policies and ensure wallet creation
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own wallet" ON wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON wallets;
DROP POLICY IF EXISTS "Admins can view all wallets" ON wallets;

-- Recreate wallet policies with proper auth checks
CREATE POLICY "Users can view their own wallet" ON wallets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own wallet" ON wallets
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all wallets" ON wallets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Fix verification_requests RLS policies
DROP POLICY IF EXISTS "Users can view their own verification requests" ON verification_requests;
DROP POLICY IF EXISTS "Users can create their own verification requests" ON verification_requests;

CREATE POLICY "Users can view their own verification requests" ON verification_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own verification requests" ON verification_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Ensure wallets are created for existing users who don't have them
INSERT INTO wallets (user_id)
SELECT user_id FROM profiles 
WHERE user_id NOT IN (SELECT user_id FROM wallets)
ON CONFLICT (user_id) DO NOTHING;