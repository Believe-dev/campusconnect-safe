-- Create function to completely delete user including auth
CREATE OR REPLACE FUNCTION delete_user_completely()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Delete all user data
    DELETE FROM wallet_transactions WHERE user_id = current_user_id;
    DELETE FROM disputes WHERE reported_by = current_user_id;
    DELETE FROM payout_requests WHERE user_id = current_user_id;
    DELETE FROM escrow_transactions WHERE buyer_id = current_user_id OR seller_id = current_user_id;
    DELETE FROM wallets WHERE user_id = current_user_id;
    DELETE FROM product_analytics WHERE product_id IN (SELECT id FROM products WHERE seller_id = current_user_id);
    DELETE FROM reviews WHERE reviewer_id = current_user_id OR reviewed_id = current_user_id;
    DELETE FROM messages WHERE sender_id = current_user_id;
    DELETE FROM conversations WHERE buyer_id = current_user_id OR seller_id = current_user_id;
    DELETE FROM orders WHERE buyer_id = current_user_id OR seller_id = current_user_id;
    DELETE FROM products WHERE seller_id = current_user_id;
    DELETE FROM favorites WHERE user_id = current_user_id;
    DELETE FROM cart WHERE user_id = current_user_id;
    DELETE FROM notifications WHERE user_id = current_user_id;
    DELETE FROM user_roles WHERE user_id = current_user_id;
    DELETE FROM profiles WHERE user_id = current_user_id;
    
    -- Delete from auth.users
    DELETE FROM auth.users WHERE id = current_user_id;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_completely() TO authenticated;