-- Authenticated seller registration and subscription renewal checkout intents.
-- These rows are private to the service-role edge functions; buyers cannot
-- self-attest a completed payment through the Data API.
CREATE TABLE public.flutterwave_seller_membership_payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('registration', 'renewal')),
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  payment_reference text NOT NULL UNIQUE,
  flutterwave_transaction_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX flutterwave_seller_membership_intents_user_status_created_idx
  ON public.flutterwave_seller_membership_payment_intents (user_id, status, created_at DESC);

ALTER TABLE public.flutterwave_seller_membership_payment_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.flutterwave_seller_membership_payment_intents FROM anon, authenticated;

-- Settle the verified checkout exactly once.  The row lock and all seller
-- side effects share this database transaction, so a duplicate callback or
-- webhook cannot extend a subscription twice.
CREATE OR REPLACE FUNCTION public.settle_flutterwave_seller_membership_payment(
  p_payment_reference text,
  p_flutterwave_transaction_id text
)
RETURNS TABLE(completed boolean, payment_purpose text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  membership_payment public.flutterwave_seller_membership_payment_intents%ROWTYPE;
  subscription_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'settle_flutterwave_seller_membership_payment can only be called from trusted server-side code.';
  END IF;

  SELECT * INTO membership_payment
  FROM public.flutterwave_seller_membership_payment_intents
  WHERE payment_reference = p_payment_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seller membership payment intent was not found.';
  END IF;

  IF membership_payment.status = 'completed' THEN
    IF membership_payment.flutterwave_transaction_id IS DISTINCT FROM p_flutterwave_transaction_id THEN
      RAISE EXCEPTION 'A different Flutterwave transaction already completed this payment intent.';
    END IF;
    RETURN QUERY SELECT true, membership_payment.purpose;
    RETURN;
  END IF;

  IF membership_payment.status <> 'pending' THEN
    RAISE EXCEPTION 'This seller membership payment can no longer be completed.';
  END IF;

  UPDATE public.flutterwave_seller_membership_payment_intents
  SET flutterwave_transaction_id = p_flutterwave_transaction_id,
      updated_at = now()
  WHERE id = membership_payment.id;

  IF membership_payment.purpose = 'registration' THEN
    INSERT INTO public.seller_registration_payments (
      user_id, amount, payment_reference, payment_method, status
    ) VALUES (
      membership_payment.user_id,
      membership_payment.amount,
      membership_payment.payment_reference,
      'flutterwave',
      'completed'
    );

    UPDATE public.profiles
    SET seller_registration_paid = true,
        seller_registration_paid_at = now(),
        account_type = 'seller',
        seller_status = 'pending',
        updated_at = now()
    WHERE user_id = membership_payment.user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Seller profile was not found.';
    END IF;

    SELECT public.create_seller_subscription(
      membership_payment.user_id,
      'monthly',
      membership_payment.payment_reference,
      membership_payment.amount
    ) INTO subscription_id;
  ELSE
    PERFORM public.renew_seller_subscription(
      membership_payment.user_id,
      membership_payment.payment_reference
    );
  END IF;

  UPDATE public.flutterwave_seller_membership_payment_intents
  SET status = 'completed', updated_at = now()
  WHERE id = membership_payment.id;

  RETURN QUERY SELECT true, membership_payment.purpose;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_flutterwave_seller_membership_payment(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_flutterwave_seller_membership_payment(text, text) TO service_role;

COMMENT ON TABLE public.flutterwave_seller_membership_payment_intents IS
  'Private Flutterwave checkout intents for an existing account seller registration or subscription renewal.';
COMMENT ON FUNCTION public.settle_flutterwave_seller_membership_payment(text, text) IS
  'service_role-only. Atomically applies one verified Flutterwave seller registration or renewal payment.';
