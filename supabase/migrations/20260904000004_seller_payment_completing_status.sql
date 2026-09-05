-- Adds a 'completing' transitional status to seller_payment_intents, needed
-- by the fix to the seller-subscription double-charge bug (see the paired
-- change to supabase/functions/_shared/sellerPayment.ts and both call
-- sites). Previously, status went straight from 'pending' to 'paid' in the
-- same atomic UPDATE that also claimed the intent for completion - so a
-- failure partway through completion (e.g. create_seller_subscription
-- erroring) left the intent stuck at 'paid' with seller_features_active
-- never actually set, and no way to retry (a retry's own
-- .eq("status","pending") claim-guard would never match a 'paid' row again).
--
-- 'completing' lets the claim (atomically won by whichever of the manual
-- verify call or the webhook gets there first, same .eq("status","pending")
-- guard as before) happen before completion runs, while 'paid' is now only
-- set after completion actually succeeds - and reverted back to 'pending' by
-- the calling code if it fails, so the same claim-guard picks it up again on
-- retry.

DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.seller_payment_intents'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.seller_payment_intents DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE public.seller_payment_intents
  ADD CONSTRAINT seller_payment_intents_status_check
  CHECK (status IN ('pending', 'completing', 'paid', 'expired'));
