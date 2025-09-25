-- Secure seller access with comprehensive RLS policies

-- Add RLS policy for products table to ensure only approved sellers can insert
DROP POLICY IF EXISTS "Users can insert their own products" ON products;
DROP POLICY IF EXISTS "Approved sellers can insert products" ON products;
CREATE POLICY "Approved sellers can insert products" ON products
    FOR INSERT WITH CHECK (
        seller_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND account_type IN ('seller', 'both') 
            AND seller_status = 'approved'
        )
    );

-- Add RLS policy for products table to ensure only approved sellers can update their products
DROP POLICY IF EXISTS "Users can update their own products" ON products;
DROP POLICY IF EXISTS "Approved sellers can update their products" ON products;
CREATE POLICY "Approved sellers can update their products" ON products
    FOR UPDATE USING (
        seller_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND account_type IN ('seller', 'both') 
            AND seller_status = 'approved'
        )
    );

-- Ensure only approved sellers can access product analytics
DROP POLICY IF EXISTS "Users can view analytics for their products" ON product_analytics;
DROP POLICY IF EXISTS "Approved sellers can view their product analytics" ON product_analytics;
CREATE POLICY "Approved sellers can view their product analytics" ON product_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM products p
            JOIN profiles pr ON p.seller_id = pr.user_id
            WHERE p.id = product_analytics.product_id 
            AND p.seller_id = auth.uid()
            AND pr.account_type IN ('seller', 'both')
            AND pr.seller_status = 'approved'
        )
    );

-- Function to verify seller approval status (server-side validation)
CREATE OR REPLACE FUNCTION verify_seller_approved(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    seller_approved BOOLEAN := FALSE;
BEGIN
    SELECT 
        CASE 
            WHEN account_type IN ('seller', 'both') AND seller_status = 'approved' 
            THEN TRUE 
            ELSE FALSE 
        END
    INTO seller_approved
    FROM profiles
    WHERE profiles.user_id = verify_seller_approved.user_id;
    
    RETURN COALESCE(seller_approved, FALSE);
END;
$$;

-- Add trigger to prevent product insertion by unapproved sellers
CREATE OR REPLACE FUNCTION check_seller_approval_before_product_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT verify_seller_approved(NEW.seller_id) THEN
        RAISE EXCEPTION 'Only approved sellers can list products';
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_seller_approval ON products;
CREATE TRIGGER trigger_check_seller_approval
    BEFORE INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION check_seller_approval_before_product_insert();

-- Add trigger to prevent product updates by unapproved sellers
CREATE OR REPLACE FUNCTION check_seller_approval_before_product_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT verify_seller_approved(NEW.seller_id) THEN
        RAISE EXCEPTION 'Only approved sellers can update products';
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_seller_approval_update ON products;
CREATE TRIGGER trigger_check_seller_approval_update
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION check_seller_approval_before_product_update();

-- Ensure wallet access is restricted to approved sellers
DROP POLICY IF EXISTS "Users can view their own wallet" ON wallets;
CREATE POLICY "Approved sellers can view their wallet" ON wallets
    FOR SELECT USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND account_type IN ('seller', 'both') 
            AND seller_status = 'approved'
        )
    );

-- Restrict verification requests to approved sellers only
DROP POLICY IF EXISTS "Users can create their own verification requests" ON verification_requests;
CREATE POLICY "Approved sellers can create verification requests" ON verification_requests
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND account_type IN ('seller', 'both') 
            AND seller_status = 'approved'
        )
    );

-- Add trigger to prevent verification requests by unapproved sellers
CREATE OR REPLACE FUNCTION check_seller_approval_before_verification_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT verify_seller_approved(NEW.user_id) THEN
        RAISE EXCEPTION 'Only approved sellers can request verification';
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_seller_approval_verification ON verification_requests;
CREATE TRIGGER trigger_check_seller_approval_verification
    BEFORE INSERT ON verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION check_seller_approval_before_verification_request();

-- Comments
COMMENT ON FUNCTION verify_seller_approved IS 'Server-side function to verify seller approval status';
COMMENT ON FUNCTION check_seller_approval_before_product_insert IS 'Prevents unapproved sellers from inserting products';
COMMENT ON FUNCTION check_seller_approval_before_product_update IS 'Prevents unapproved sellers from updating products';
COMMENT ON FUNCTION check_seller_approval_before_verification_request IS 'Prevents unapproved sellers from requesting verification';