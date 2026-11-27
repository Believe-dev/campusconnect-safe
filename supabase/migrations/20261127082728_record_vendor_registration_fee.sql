-- Keep the subscription ledger equal to the verified Flutterwave amount. The
-- registration and renewal flows pass server-controlled amounts (₦2,500 and
-- ₦1,000 respectively), so admin finance totals no longer understate a
-- completed vendor registration as ₦1,000.
CREATE OR REPLACE FUNCTION public.create_seller_subscription(
  p_user_id uuid,
  p_subscription_type text DEFAULT 'monthly',
  p_payment_reference text DEFAULT NULL,
  p_amount numeric DEFAULT 1000.00
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_id uuid;
  expires_date timestamptz;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'create_seller_subscription can only be called from trusted server-side code.';
  END IF;

  IF p_subscription_type <> 'monthly' THEN
    RAISE EXCEPTION 'Only monthly subscriptions are allowed.';
  END IF;

  IF p_amount NOT IN (1000.00, 2500.00) THEN
    RAISE EXCEPTION 'The seller access payment amount is invalid.';
  END IF;

  expires_date := now() + interval '1 month';

  INSERT INTO public.seller_subscriptions (
    user_id, subscription_type, amount, payment_reference, starts_at, expires_at, status
  ) VALUES (
    p_user_id,
    'monthly',
    p_amount,
    coalesce(p_payment_reference, 'manual_' || gen_random_uuid()::text),
    now(),
    expires_date,
    'active'
  ) RETURNING id INTO subscription_id;

  UPDATE public.profiles
  SET seller_subscription_expires_at = expires_date,
      seller_features_active = true,
      seller_subscription_type = 'monthly',
      seller_last_payment_date = now(),
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.notifications (user_id, title, message, type, created_at)
  VALUES (
    p_user_id,
    'Seller Subscription Activated',
    CASE
      WHEN p_amount = 2500.00 THEN 'Your vendor registration payment (₦2,500) is complete. Seller access is active for 30 days.'
      ELSE 'Your monthly seller subscription (₦1,000) is now active. You can access all seller features for 30 days.'
    END,
    'success',
    now()
  );

  RETURN subscription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_seller_subscription(uuid, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_seller_subscription(uuid, text, text, numeric) TO service_role;

COMMENT ON FUNCTION public.create_seller_subscription(uuid, text, text, numeric) IS
  'service_role-only. Records the verified ₦2,500 vendor registration or ₦1,000 monthly renewal payment and activates one month of seller access.';
