-- Fix payout processing function to handle edge cases and improve error handling
DROP FUNCTION IF EXISTS process_payout_request(UUID, UUID, TEXT);

-- Create improved payout processing function
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
  payout_bank_account_number TEXT;
  wallet_balance DECIMAL(10,2);
  wallet_record_id UUID;
BEGIN
  -- Get the payout request details with all required fields
  SELECT 
    user_id, wallet_id, amount, bank_name, bank_account_name, bank_account_number
  INTO 
    payout_user_id, payout_wallet_id, payout_amount, payout_bank_name, payout_bank_account_name, payout_bank_account_number
  FROM payout_requests
  WHERE id = payout_id AND status = 'pending';
  
  -- Check if payout request exists and is pending
  IF payout_user_id IS NULL THEN
    RAISE NOTICE 'Payout request not found or not pending: %', payout_id;
    RETURN FALSE;
  END IF;
  
  -- Get the wallet balance and wallet ID
  SELECT available_balance, id INTO wallet_balance, wallet_record_id
  FROM wallets
  WHERE id = payout_wallet_id;
  
  -- Check if wallet exists
  IF wallet_record_id IS NULL THEN
    RAISE NOTICE 'Wallet not found: %', payout_wallet_id;
    RETURN FALSE;
  END IF;
  
  -- Check if wallet has sufficient balance (with small tolerance for decimal precision)
  IF wallet_balance < payout_amount THEN
    RAISE NOTICE 'Insufficient balance. Available: %, Requested: %', wallet_balance, payout_amount;
    RETURN FALSE;
  END IF;
  
  -- Start transaction block
  BEGIN
    -- Deduct amount from wallet
    UPDATE wallets
    SET available_balance = available_balance - payout_amount,
        updated_at = NOW()
    WHERE id = payout_wallet_id;
    
    -- Check if wallet update was successful
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Failed to update wallet balance';
    END IF;
    
    -- Update payout request status to approved
    UPDATE payout_requests
    SET status = 'approved',
        admin_notes = admin_notes,
        processed_by = admin_id,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = payout_id;
    
    -- Check if payout request update was successful
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Failed to update payout request status';
    END IF;
    
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
      'Payout to ' || payout_bank_account_name || ' (' || payout_bank_name || ') - ' || payout_bank_account_number,
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
      'Your payout request of ₦' || payout_amount::TEXT || ' has been approved and processed. The funds have been transferred to your bank account (' || payout_bank_name || ').',
      'success'
    );
    
    RAISE NOTICE 'Payout processed successfully for user: %, amount: %', payout_user_id, payout_amount;
    RETURN TRUE;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error and rollback
    RAISE NOTICE 'Error processing payout: %', SQLERRM;
    RETURN FALSE;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_payout_request(UUID, UUID, TEXT) TO authenticated;

-- Create function to check payout eligibility (for debugging)
CREATE OR REPLACE FUNCTION check_payout_eligibility(payout_id UUID)
RETURNS TABLE (
  payout_exists BOOLEAN,
  payout_status TEXT,
  wallet_exists BOOLEAN,
  available_balance DECIMAL(10,2),
  requested_amount DECIMAL(10,2),
  sufficient_balance BOOLEAN,
  user_id UUID,
  wallet_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payout_rec RECORD;
  wallet_rec RECORD;
BEGIN
  -- Get payout request details
  SELECT pr.*, pr.status as payout_status
  INTO payout_rec
  FROM payout_requests pr
  WHERE pr.id = payout_id;
  
  -- Get wallet details if payout exists
  IF payout_rec.id IS NOT NULL THEN
    SELECT w.*
    INTO wallet_rec
    FROM wallets w
    WHERE w.id = payout_rec.wallet_id;
  END IF;
  
  -- Return diagnostic information
  RETURN QUERY SELECT
    (payout_rec.id IS NOT NULL) as payout_exists,
    COALESCE(payout_rec.status, 'not_found') as payout_status,
    (wallet_rec.id IS NOT NULL) as wallet_exists,
    COALESCE(wallet_rec.available_balance, 0.00) as available_balance,
    COALESCE(payout_rec.amount, 0.00) as requested_amount,
    (COALESCE(wallet_rec.available_balance, 0.00) >= COALESCE(payout_rec.amount, 0.00)) as sufficient_balance,
    payout_rec.user_id,
    payout_rec.wallet_id;
END;
$$;

-- Grant execute permission for debugging function
GRANT EXECUTE ON FUNCTION check_payout_eligibility(UUID) TO authenticated;