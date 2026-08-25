-- ====================================================================
-- ANCHOR SERVER-SIDE INTEGRATION INFRASTRUCTURE
--
-- Backs the move of all real Anchor BaaS calls out of the browser and into
-- Supabase Edge Functions: real KYC verification status, webhook delivery
-- idempotency, per-order Sub-Ledger accounts, OFAC/sanctions screening,
-- and phone OTP verification.
-- ====================================================================

-- 1. Real KYC status on profiles (replaces the client-side instant "approved" flow).
--    kyc_status is the source of truth for whether Anchor has actually confirmed identity;
--    seller_status is only flipped to 'approved' by the webhook handler once kyc_status = 'verified'.
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'unverified' CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS anchor_customer_id TEXT,
ADD COLUMN IF NOT EXISTS sanctions_status TEXT DEFAULT 'unscreened' CHECK (sanctions_status IN ('unscreened', 'clear', 'flagged')),
ADD COLUMN IF NOT EXISTS sanctions_screened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- 2. Per-order Anchor Sub-Ledger account fields, so a buyer's payment lands in an
--    account tied to the specific order rather than a general pool.
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS anchor_sub_account_id TEXT,
ADD COLUMN IF NOT EXISTS anchor_sub_account_number TEXT,
ADD COLUMN IF NOT EXISTS anchor_bank_name TEXT;

ALTER TABLE escrow_transactions
ADD COLUMN IF NOT EXISTS anchor_sub_account_id TEXT,
ADD COLUMN IF NOT EXISTS anchor_sub_account_number TEXT,
ADD COLUMN IF NOT EXISTS release_reference TEXT,
ADD COLUMN IF NOT EXISTS reversal_reference TEXT,
-- Tracks the actual bank-side transfer leg separately from the fund-accounting status
-- (status/released_at above). The DB ledger (status='held'->'released') is updated
-- atomically and first via release_escrow_funds()/reverse_escrow_funds(); the Anchor
-- transfer call happens only after that DB claim succeeds, so a failed Anchor call
-- never causes a double-transfer on retry - it just needs manual reconciliation.
ADD COLUMN IF NOT EXISTS anchor_transfer_status TEXT DEFAULT 'pending' CHECK (anchor_transfer_status IN ('pending', 'sent', 'failed'));

-- Carry the sub-account fields from the order into the escrow row when it's created.
CREATE OR REPLACE FUNCTION create_escrow_transaction()
RETURNS TRIGGER AS $$
DECLARE
    commission_rate DECIMAL(5,4) := 0.00; -- 0% commission - sellers pay registration fee instead
    seller_amount DECIMAL(10,2);
BEGIN
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        seller_amount := NEW.total_amount;

        INSERT INTO escrow_transactions (
            order_id,
            buyer_id,
            seller_id,
            amount,
            commission_amount,
            seller_amount,
            auto_release_at,
            anchor_sub_account_id,
            anchor_sub_account_number
        ) VALUES (
            NEW.id,
            NEW.buyer_id,
            NEW.seller_id,
            NEW.total_amount,
            0.00,
            seller_amount,
            NEW.auto_confirm_at,
            NEW.anchor_sub_account_id,
            NEW.anchor_sub_account_number
        )
        ON CONFLICT (order_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Webhook delivery idempotency - a retried/duplicate webhook delivery for the same
--    Anchor event id must be a no-op, not a second state transition.
CREATE TABLE IF NOT EXISTS anchor_webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    anchor_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE anchor_webhook_events ENABLE ROW LEVEL SECURITY;
-- Written only by the service-role webhook handler; no client access.
DROP POLICY IF EXISTS "No client access to webhook events" ON anchor_webhook_events;
CREATE POLICY "No client access to webhook events" ON anchor_webhook_events
    FOR ALL USING (false);

-- 4. OFAC/sanctions screening. Anchor does not perform this - it's the platform's
--    responsibility. sanctions_watchlist is a locally cached, periodically refreshed
--    copy of the public US Treasury OFAC SDN list; sellers are name-matched against it
--    before KYC can be marked verified.
CREATE TABLE IF NOT EXISTS sanctions_watchlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'OFAC_SDN',
    list_type TEXT,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_sanctions_watchlist_normalized_name ON sanctions_watchlist(normalized_name);
CREATE INDEX IF NOT EXISTS idx_sanctions_watchlist_trgm ON sanctions_watchlist USING gin (normalized_name gin_trgm_ops);

ALTER TABLE sanctions_watchlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No client access to sanctions watchlist" ON sanctions_watchlist;
CREATE POLICY "No client access to sanctions watchlist" ON sanctions_watchlist
    FOR ALL USING (false);

-- Fuzzy name screening against the cached watchlist using trigram similarity, so minor
-- spelling/transliteration differences still surface a match for manual review.
-- SECURITY DEFINER so it can be called via RPC without granting clients table access.
CREATE OR REPLACE FUNCTION screen_sanctions_name(search_name TEXT, threshold REAL DEFAULT 0.5)
RETURNS TABLE(full_name TEXT, score REAL) AS $$
    SELECT full_name, similarity(normalized_name, search_name) AS score
    FROM sanctions_watchlist
    WHERE similarity(normalized_name, search_name) >= threshold
    ORDER BY score DESC
    LIMIT 5;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE TABLE IF NOT EXISTS sanctions_screenings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    screened_name TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('clear', 'flagged')),
    matched_watchlist_name TEXT,
    match_score NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sanctions_screenings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view sanctions screenings" ON sanctions_screenings;
CREATE POLICY "Admins can view sanctions screenings" ON sanctions_screenings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- 5. Phone OTP verification.
CREATE TABLE IF NOT EXISTS phone_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON phone_verifications(user_id);

ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own phone verifications" ON phone_verifications;
CREATE POLICY "Users can view their own phone verifications" ON phone_verifications
    FOR SELECT USING (auth.uid() = user_id);

-- 6. Schedule the existing auto_release_escrow() function so the protection-window
--    auto-release actually runs. Wrapped so a plan without pg_cron enabled doesn't
--    fail this migration - if this doesn't take effect, enable the pg_cron extension
--    in the Supabase dashboard and re-run the SELECT cron.schedule(...) call below.
DO $migration$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;

    PERFORM cron.unschedule('auto-release-escrow')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-release-escrow');

    PERFORM cron.schedule(
        'auto-release-escrow',
        '*/15 * * * *',
        $cron$SELECT auto_release_escrow();$cron$
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron scheduling skipped (extension unavailable on this plan): %', SQLERRM;
END;
$migration$;
