-- Flutterwave seller checkout occurs before an auth user exists. This private, service-role-only
-- table keeps the payment state and a hash of the browser's one-time claim
-- token; failed or cancelled payments can therefore never create an account.
CREATE TABLE public.seller_signup_payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  payment_reference text NOT NULL UNIQUE,
  claim_token_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'claiming', 'claimed', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX seller_signup_payment_intents_email_status_idx
  ON public.seller_signup_payment_intents (email, status);

ALTER TABLE public.seller_signup_payment_intents ENABLE ROW LEVEL SECURITY;

-- This legacy trigger trusted user-editable auth metadata and could fabricate
-- a completed payment record. Server-verified payment functions now own the
-- paid transition, so remove the obsolete bypass entirely.
DROP TRIGGER IF EXISTS validate_seller_registration_trigger ON public.profiles;
