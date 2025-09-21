-- Create function to completely delete a user and all their data
CREATE OR REPLACE FUNCTION delete_user_account(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Only allow users to delete their own account
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Access denied: can only delete own account';
  END IF;
  
  -- Delete user data in the correct order to handle foreign key constraints
  
  -- Delete product reports (both as reporter and for their products)
  DELETE FROM product_reports WHERE reported_by = user_id;
  DELETE FROM product_reports WHERE product_id IN (
    SELECT id FROM products WHERE seller_id = user_id
  );
  
  -- Delete reviews (both given and received)
  DELETE FROM reviews WHERE reviewer_id = user_id OR reviewed_id = user_id;
  
  -- Delete notifications
  DELETE FROM notifications WHERE user_id = user_id;
  
  -- Delete verification requests
  DELETE FROM verification_requests WHERE user_id = user_id;
  
  -- Delete payout requests
  DELETE FROM payout_requests WHERE user_id = user_id;
  
  -- Delete favorites
  DELETE FROM favorites WHERE user_id = user_id;
  
  -- Delete cart items
  DELETE FROM cart WHERE user_id = user_id;
  
  -- Delete messages in conversations where user is involved
  DELETE FROM messages WHERE conversation_id IN (
    SELECT id FROM conversations 
    WHERE buyer_id = user_id OR seller_id = user_id
  );
  
  -- Delete conversations
  DELETE FROM conversations WHERE buyer_id = user_id OR seller_id = user_id;
  
  -- Delete escrow transactions for user's orders
  DELETE FROM escrow_transactions WHERE order_id IN (
    SELECT id FROM orders WHERE buyer_id = user_id OR seller_id = user_id
  );
  
  -- Delete orders (as buyer or seller)
  DELETE FROM orders WHERE buyer_id = user_id OR seller_id = user_id;
  
  -- Delete products
  DELETE FROM products WHERE seller_id = user_id;
  
  -- Delete user roles
  DELETE FROM user_roles WHERE user_id = user_id;
  
  -- Delete profile
  DELETE FROM profiles WHERE user_id = user_id;
  
  -- Note: auth.users deletion is handled by Supabase Auth API
  -- We cannot delete from auth.users directly in a function
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return false
    RAISE LOG 'Error deleting user account %: %', user_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users (they can only delete their own account)
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- Note: RLS policies on auth.users are managed by Supabase Auth