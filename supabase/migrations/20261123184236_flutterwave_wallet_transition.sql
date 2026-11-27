-- Flutterwave wallet transition (Phase 3).
-- A browser must never be able to mint, debit, or submit payout records against
-- its own wallet. Flutterwave Edge Functions and privileged SQL own those writes.

DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can manage their payout requests" ON public.payout_requests;
DROP POLICY IF EXISTS "Users can view their own payout requests" ON public.payout_requests;

CREATE POLICY "Users can view their own payout requests"
  ON public.payout_requests
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.wallets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.payout_requests FROM anon, authenticated;
GRANT SELECT ON TABLE public.wallets, public.payout_requests TO authenticated;
