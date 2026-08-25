-- Create function to handle account deletion
CREATE OR REPLACE FUNCTION delete_user_account()
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
    
    -- Delete only from tables that exist
    DELETE FROM public.notifications WHERE user_id = current_user_id;
    DELETE FROM public.reviews WHERE reviewer_id = current_user_id OR reviewed_id = current_user_id;
    DELETE FROM public.messages WHERE sender_id = current_user_id;
    DELETE FROM public.conversations WHERE buyer_id = current_user_id OR seller_id = current_user_id;
    DELETE FROM public.orders WHERE buyer_id = current_user_id OR seller_id = current_user_id;
    DELETE FROM public.products WHERE seller_id = current_user_id;
    DELETE FROM public.profiles WHERE user_id = current_user_id;
    
    RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;