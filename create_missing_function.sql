-- Create the missing release_escrow_funds function as an alias
CREATE OR REPLACE FUNCTION release_escrow_funds(escrow_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    order_uuid UUID;
BEGIN
    -- Get the order_id from escrow_id
    SELECT order_id INTO order_uuid 
    FROM escrow_transactions 
    WHERE id = escrow_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Call our working function
    RETURN release_escrow_to_wallet(order_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;