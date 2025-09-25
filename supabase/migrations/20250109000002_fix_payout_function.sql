-- Fix payout processing function to use correct column names and avoid record field errors
DROP FUNCTION IF EXISTS process_payout_request(UUID, UUID, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS process_payout_request(UUID, UUID, TEXT);

-- Create the correct payout processing function
CREATE OR REPLACE FUNCTION process_payout_request(
  payout_id UUID,
  admin_id UUID,
  admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payout_user_id UUID;
  payout_wallet_id UUID;
  payout_amount DECIMAL(10,2);
  payout_bank_name TEXT;
  payout_bank_account_name TEXT;
  wallet_balance DECIMAL(10,2);
  wallet_record_id UUID;
BEGIN
  -- Get the payout request details with specific fields to avoid "record has no field" errors
  SELECT 
    user_id, wallet_id, amount, bank_name, bank_account_name
  INTO 
    payout_user_id, payout_wallet_id, payout_amount, payout_bank_name, payout_bank_account_name
  FROM payout_requests
  WHERE id = payout_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get the wallet balance and wallet ID
  SELECT available_balance, id INTO wallet_balance, wallet_record_id
  FROM wallets
  WHERE id = payout_wallet_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if wallet has sufficient balance
  IF wallet_balance < payout_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Start transaction
  BEGIN
    -- Deduct amount from wallet
    UPDATE wallets
    SET available_balance = available_balance - payout_amount,
        updated_at = NOW()
    WHERE id = payout_wallet_id;
    
    -- Update payout request status
    UPDATE payout_requests
    SET status = 'approved',
        admin_notes = admin_notes,
        processed_by = admin_id,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = payout_id;
    
    -- Create wallet transaction record
    INSERT INTO wallet_transactions (
      wallet_id,
      user_id,
      type,
      amount,
      description,
      reference_id,
      reference_type,
      status
    ) VALUES (
      wallet_record_id,
      payout_user_id,
      'payout',
      -payout_amount,
      'Payout to ' || payout_bank_account_name || ' (' || payout_bank_name || ')',
      payout_id::TEXT,
      'payout',
      'completed'
    );
    
    -- Create notification for user
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type
    ) VALUES (
      payout_user_id,
      'Payout Processed! 💰',
      'Your payout request of ₦' || payout_amount::TEXT || ' has been approved and processed. The funds have been transferred to your bank account.',
      'success'
    );
    
    RETURN TRUE;
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback on error
    RETURN FALSE;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_payout_request(UUID, UUID, TEXT) TO authenticated;