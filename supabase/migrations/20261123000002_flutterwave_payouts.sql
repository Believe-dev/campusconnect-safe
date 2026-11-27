-- Flutterwave payout support (Phase 2).
-- Seller funds stay in the platform ledger after escrow release and move to a
-- bank account only through a verified Flutterwave transfer request.

ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS bank_code text,
  ADD COLUMN IF NOT EXISTS payout_provider text NOT NULL DEFAULT 'anchor'
    CHECK (payout_provider IN ('anchor', 'flutterwave', 'manual')),
  ADD COLUMN IF NOT EXISTS provider_transfer_id text,
  ADD COLUMN IF NOT EXISTS provider_reference text;

CREATE UNIQUE INDEX IF NOT EXISTS payout_requests_provider_reference_key
  ON public.payout_requests (provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS payout_requests_flutterwave_transfer_idx
  ON public.payout_requests (provider_transfer_id)
  WHERE payout_provider = 'flutterwave';

ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS settlement_provider text,
  ADD COLUMN IF NOT EXISTS settlement_status text NOT NULL DEFAULT 'pending'
    CHECK (settlement_status IN ('pending', 'not_required', 'sent', 'failed'));

-- This is service-role-only because it performs an atomic wallet debit and
-- creates the payout request. It intentionally does not call Flutterwave;
-- external network calls cannot participate in a Postgres transaction.
CREATE OR REPLACE FUNCTION public.create_flutterwave_payout_request(
  p_user_id uuid,
  p_amount numeric,
  p_bank_name text,
  p_bank_code text,
  p_account_number text,
  p_account_name text,
  p_reference text,
  p_narration text DEFAULT NULL
)
RETURNS TABLE (payout_id uuid, wallet_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_payout_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'create_flutterwave_payout_request can only be called by an edge function.';
  END IF;
  IF p_amount < 100 OR p_amount <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'Invalid withdrawal amount.';
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found.'; END IF;
  IF v_wallet.available_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient available balance.';
  END IF;

  UPDATE public.wallets
  SET available_balance = available_balance - p_amount, updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.payout_requests (
    user_id, wallet_id, amount, bank_account_name, bank_account_number,
    bank_name, bank_code, status, transfer_code, transfer_status,
    payout_provider, provider_reference, admin_notes
  ) VALUES (
    p_user_id, v_wallet.id, p_amount, p_account_name, p_account_number,
    p_bank_name, p_bank_code, 'processing', p_reference, 'processing',
    'flutterwave', p_reference, COALESCE(p_narration, 'Flutterwave bank payout requested')
  ) RETURNING id INTO v_payout_id;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, description, reference_id, reference_type, status
  ) VALUES (
    v_wallet.id, p_user_id, 'payout', -p_amount,
    'Flutterwave bank payout to ' || p_account_name || ' (' || p_bank_name || ')',
    v_payout_id, 'flutterwave_payout', 'pending'
  );

  RETURN QUERY SELECT v_payout_id, v_wallet.id;
END;
$$;

-- Settles a transfer exactly once. A failed Flutterwave payout returns the
-- reserved wallet money once; a duplicate webhook cannot credit it twice.
CREATE OR REPLACE FUNCTION public.settle_flutterwave_payout(
  p_payout_id uuid,
  p_provider_transfer_id text,
  p_success boolean,
  p_note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout public.payout_requests%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'settle_flutterwave_payout can only be called by an edge function.';
  END IF;
  SELECT * INTO v_payout FROM public.payout_requests WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND OR v_payout.payout_provider <> 'flutterwave' THEN RETURN false; END IF;

  IF p_success THEN
    IF v_payout.transfer_status = 'success' THEN RETURN false; END IF;
    IF v_payout.transfer_status = 'failed' THEN RETURN false; END IF;
    UPDATE public.payout_requests
    SET status = 'completed', transfer_status = 'success', provider_transfer_id = COALESCE(p_provider_transfer_id, provider_transfer_id),
        processed_at = now(), admin_notes = COALESCE(p_note, admin_notes), updated_at = now()
    WHERE id = v_payout.id;
    UPDATE public.wallet_transactions SET status = 'completed'
    WHERE reference_id = v_payout.id AND reference_type = 'flutterwave_payout' AND status = 'pending';
    RETURN true;
  END IF;

  IF v_payout.transfer_status IN ('failed', 'success') THEN RETURN false; END IF;
  UPDATE public.wallets SET available_balance = available_balance + v_payout.amount, updated_at = now()
  WHERE id = v_payout.wallet_id;
  UPDATE public.payout_requests
  SET status = 'failed', transfer_status = 'failed', provider_transfer_id = COALESCE(p_provider_transfer_id, provider_transfer_id),
      processed_at = now(), admin_notes = COALESCE(p_note, admin_notes), updated_at = now()
  WHERE id = v_payout.id;
  UPDATE public.wallet_transactions SET status = 'failed'
  WHERE reference_id = v_payout.id AND reference_type = 'flutterwave_payout' AND status = 'pending';
  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, description, reference_id, reference_type, status
  ) VALUES (
    v_payout.wallet_id, v_payout.user_id, 'refund', v_payout.amount,
    'Refund for failed Flutterwave payout', v_payout.id, 'flutterwave_payout_refund', 'completed'
  );
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_flutterwave_payout_request(uuid, numeric, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_flutterwave_payout(uuid, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_flutterwave_payout_request(uuid, numeric, text, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_flutterwave_payout(uuid, text, boolean, text) TO service_role;
