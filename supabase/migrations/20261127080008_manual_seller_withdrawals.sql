-- Manual seller withdrawals. Funds are reserved immediately so they cannot be
-- spent twice, then staff complete the transfer after three business days.
-- Business days in this first policy exclude Saturday and Sunday; public
-- holidays can be handled manually by staff until a holiday calendar is added.
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS available_for_processing_on date;

CREATE INDEX payout_requests_manual_due_idx
  ON public.payout_requests (available_for_processing_on, created_at)
  WHERE payout_provider = 'manual' AND status = 'pending';

CREATE UNIQUE INDEX payout_requests_one_active_manual_request_per_user_idx
  ON public.payout_requests (user_id)
  WHERE payout_provider = 'manual' AND status IN ('pending', 'processing');

CREATE OR REPLACE FUNCTION public.create_manual_payout_request(
  p_user_id uuid,
  p_amount numeric,
  p_bank_name text,
  p_account_number text,
  p_account_name text
)
RETURNS TABLE(payout_id uuid, available_for_processing_on date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_payout_id uuid;
  v_available_on date := current_date;
  v_business_days integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'create_manual_payout_request can only be called by an edge function.';
  END IF;
  IF p_amount < 100 OR p_amount <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'Invalid withdrawal amount.';
  END IF;
  IF length(trim(p_bank_name)) = 0 OR length(trim(p_bank_name)) > 120
    OR length(trim(p_account_name)) = 0 OR length(trim(p_account_name)) > 160
    OR p_account_number !~ '^\\d{10}$' THEN
    RAISE EXCEPTION 'Invalid bank details.';
  END IF;

  -- A row lock serializes balance checks and the one-active-request policy.
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found.'; END IF;
  IF v_wallet.available_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient available balance.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.payout_requests
    WHERE user_id = p_user_id
      AND payout_provider = 'manual'
      AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'You already have a withdrawal awaiting processing.';
  END IF;

  WHILE v_business_days < 3 LOOP
    v_available_on := v_available_on + 1;
    IF extract(isodow FROM v_available_on) < 6 THEN
      v_business_days := v_business_days + 1;
    END IF;
  END LOOP;

  UPDATE public.wallets
  SET available_balance = available_balance - p_amount, updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.payout_requests (
    user_id, wallet_id, amount, bank_account_name, bank_account_number,
    bank_name, status, transfer_status, payout_provider,
    available_for_processing_on, admin_notes
  ) VALUES (
    p_user_id, v_wallet.id, p_amount, trim(p_account_name), p_account_number,
    trim(p_bank_name), 'pending', 'manual_pending', 'manual',
    v_available_on, 'Manual withdrawal requested. Eligible for processing on ' || v_available_on::text || '.'
  ) RETURNING id INTO v_payout_id;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, description, reference_id, reference_type, status
  ) VALUES (
    v_wallet.id, p_user_id, 'payout', -p_amount,
    'Manual withdrawal requested to ' || trim(p_account_name) || ' (' || trim(p_bank_name) || ')',
    v_payout_id, 'manual_payout', 'pending'
  );

  RETURN QUERY SELECT v_payout_id, v_available_on;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_manual_payout_request(
  p_payout_id uuid,
  p_processed_by uuid,
  p_transfer_reference text,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout public.payout_requests%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' OR NOT public.has_admin_permission(p_processed_by, 'escrow') THEN
    RAISE EXCEPTION 'You do not have permission to complete withdrawal requests.';
  END IF;
  IF length(trim(coalesce(p_transfer_reference, ''))) = 0 OR length(trim(p_transfer_reference)) > 160 THEN
    RAISE EXCEPTION 'A bank-transfer reference is required.';
  END IF;

  SELECT * INTO v_payout
  FROM public.payout_requests
  WHERE id = p_payout_id
  FOR UPDATE;
  IF NOT FOUND OR v_payout.payout_provider <> 'manual' THEN
    RAISE EXCEPTION 'Manual withdrawal request not found.';
  END IF;
  IF v_payout.status <> 'pending' THEN
    RAISE EXCEPTION 'Withdrawal request status is ''%'', not ''pending''.', v_payout.status;
  END IF;
  IF v_payout.available_for_processing_on IS NULL OR current_date < v_payout.available_for_processing_on THEN
    RAISE EXCEPTION 'This withdrawal is not eligible until %.', v_payout.available_for_processing_on;
  END IF;

  UPDATE public.payout_requests
  SET status = 'completed',
      transfer_status = 'manual_completed',
      transfer_code = trim(p_transfer_reference),
      processed_by = p_processed_by,
      processed_at = now(),
      admin_notes = COALESCE(NULLIF(trim(p_notes), ''), 'Manual bank transfer completed. Reference: ' || trim(p_transfer_reference)),
      updated_at = now()
  WHERE id = v_payout.id;

  UPDATE public.wallet_transactions
  SET status = 'completed'
  WHERE reference_id = v_payout.id
    AND reference_type = 'manual_payout'
    AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.create_manual_payout_request(uuid, numeric, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_manual_payout_request(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_manual_payout_request(uuid, numeric, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_manual_payout_request(uuid, uuid, text, text) TO service_role;

COMMENT ON FUNCTION public.create_manual_payout_request(uuid, numeric, text, text, text) IS
  'service_role-only. Reserves seller funds and schedules a manual withdrawal after three weekdays.';
COMMENT ON FUNCTION public.complete_manual_payout_request(uuid, uuid, text, text) IS
  'service_role-only. Edge function verifies escrow permission then marks a due manual payout completed.';
