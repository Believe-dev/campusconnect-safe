-- Drop existing function first
DROP FUNCTION IF EXISTS withdraw_dispute(UUID);

-- Function to allow users to withdraw their own disputes
CREATE FUNCTION withdraw_dispute(dispute_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dispute_user_id UUID;
BEGIN
  -- Get the user who reported the dispute
  SELECT reported_by INTO dispute_user_id
  FROM disputes
  WHERE id = dispute_id AND status IN ('open', 'investigating');
  
  -- Check if dispute exists and is in withdrawable status
  IF dispute_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if current user is the one who reported the dispute
  IF auth.uid() != dispute_user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Update dispute status to closed
  UPDATE disputes
  SET 
    status = 'closed',
    resolution = 'Withdrawn by reporter',
    resolved_by = auth.uid(),
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = dispute_id;
  
  -- Create notification for the other party (seller/buyer)
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type
  )
  SELECT 
    CASE 
      WHEN o.seller_id = dispute_user_id THEN o.buyer_id
      ELSE o.seller_id
    END,
    'Dispute Withdrawn',
    'The dispute for your order has been withdrawn by the other party.',
    'info'
  FROM disputes d
  JOIN orders o ON o.id = d.order_id
  WHERE d.id = dispute_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION withdraw_dispute(UUID) TO authenticated;