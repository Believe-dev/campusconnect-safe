-- Create function to process payout requests
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
  payout_record RECORD;
  wallet_balance DECIMAL(10,2);
  wallet_record_id UUID;
BEGIN
  -- Get the payout request with specific fields to avoid "record has no field" errors
  SELECT 
    id, user_id, wallet_id, amount, bank_account_name, bank_name, status
  INTO payout_record
  FROM payout_requests
  WHERE id = payout_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get the wallet balance and wallet ID
  SELECT available_balance, id INTO wallet_balance, wallet_record_id
  FROM wallets
  WHERE id = payout_record.wallet_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if wallet has sufficient balance
  IF wallet_balance < payout_record.amount THEN
    RETURN FALSE;
  END IF;
  
  -- Start transaction
  BEGIN
    -- Deduct amount from wallet
    UPDATE wallets
    SET available_balance = available_balance - payout_record.amount,
        updated_at = NOW()
    WHERE id = payout_record.wallet_id;
    
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
      payout_record.user_id,
      'payout',
      -payout_record.amount,
      'Payout to ' || payout_record.bank_account_name || ' (' || payout_record.bank_name || ')',
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
      payout_record.user_id,
      'Payout Processed! 💰',
      'Your payout request of ₦' || payout_record.amount::TEXT || ' has been approved and processed. The funds have been transferred to your bank account.',
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