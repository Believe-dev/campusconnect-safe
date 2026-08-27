-- Real Anchor-backed seller registration/renewal payment collection, replacing
-- the disabled usePaystack fail-safe. Also closes three free-seller bypasses
-- found while building this: none of them depend on usePaystack being broken,
-- so leaving them open would have let anyone skip the real flow being added
-- here entirely.

-- ============================================================================
-- 1. seller_payment_intents: mirrors the relevant slice of `orders` (the
--    Anchor Sub-Ledger tracking columns) for a seller registration/renewal
--    payment instead of a product order. No client INSERT/UPDATE policy is
--    granted at all - every write goes through the anchor-seller-payment-init
--    /verify edge functions (service_role), by design, so there's no
--    self-attestable row to forge the way seller_registration_payments had.
-- ============================================================================

CREATE TABLE seller_payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose IN ('registration', 'renewal')),
    amount NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired')),
    anchor_sub_account_id TEXT,
    anchor_sub_account_number TEXT,
    anchor_bank_name TEXT,
    payment_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seller_payment_intents_user_id ON seller_payment_intents(user_id);
CREATE INDEX idx_seller_payment_intents_sub_account ON seller_payment_intents(anchor_sub_account_id);

ALTER TABLE seller_payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment intents" ON seller_payment_intents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment intents" ON seller_payment_intents
    FOR SELECT USING (public.is_admin(auth.uid()));

-- ============================================================================
-- 2. Hole 1: seller_registration_payments' INSERT policy only checked row
--    ownership, not the status value - any authenticated user could insert
--    their own "status: completed" row directly, which is exactly what the
--    prevent_seller_bypass trigger (from the original security migration)
--    checks for before allowing account_type -> 'seller'. Nothing legitimate
--    needs to insert into this table from the client anymore - the new edge
--    functions do it server-side - so the policy is dropped outright rather
--    than narrowed.
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own registration payments" ON seller_registration_payments;

ALTER TABLE seller_registration_payments ALTER COLUMN payment_method SET DEFAULT 'anchor';

-- ============================================================================
-- 3. Hole 2 & 3: create_seller_subscription / renew_seller_subscription had
--    no caller check at all - any authenticated user could call either
--    directly for any p_user_id and grant themselves (or anyone) a free
--    active subscription. Restricted to service_role, matching item 1's
--    admin-payout-chain pattern - these should now only ever be called from
--    the seller-payment edge functions or the webhook handler. Bodies
--    otherwise unchanged from 20250101000600_fix_seller_applications_and_subscriptions.sql
--    and 20250101000400_update_seller_subscription_pricing.sql.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_seller_subscription(
    p_user_id UUID,
    p_subscription_type TEXT DEFAULT 'monthly',
    p_payment_reference TEXT DEFAULT NULL,
    p_amount DECIMAL DEFAULT 1000.00
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    subscription_id UUID;
    expires_date TIMESTAMP WITH TIME ZONE;
BEGIN
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'create_seller_subscription can only be called from trusted server-side code.';
    END IF;

    IF p_subscription_type != 'monthly' THEN
        RAISE EXCEPTION 'Only monthly subscriptions are allowed. Price: ₦1000 per month';
    END IF;

    expires_date := NOW() + INTERVAL '1 month';

    INSERT INTO seller_subscriptions (
        user_id, subscription_type, amount, payment_reference, starts_at, expires_at, status
    ) VALUES (
        p_user_id, 'monthly', 1000.00, COALESCE(p_payment_reference, 'manual_' || gen_random_uuid()::text), NOW(), expires_date, 'active'
    ) RETURNING id INTO subscription_id;

    UPDATE profiles
    SET
        seller_subscription_expires_at = expires_date,
        seller_features_active = TRUE,
        seller_subscription_type = 'monthly',
        seller_last_payment_date = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO notifications (user_id, title, message, type, created_at)
    VALUES (
        p_user_id,
        'Seller Subscription Activated',
        'Your monthly seller subscription (₦1,000) is now active. You can access all seller features for 30 days.',
        'success',
        NOW()
    );

    RETURN subscription_id;
END;
$$;

CREATE OR REPLACE FUNCTION renew_seller_subscription(
    p_user_id UUID,
    p_payment_reference TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_expires_date TIMESTAMP WITH TIME ZONE;
BEGIN
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'renew_seller_subscription can only be called from trusted server-side code.';
    END IF;

    new_expires_date := GREATEST(
        COALESCE((SELECT seller_subscription_expires_at FROM profiles WHERE user_id = p_user_id), NOW()),
        NOW()
    ) + INTERVAL '1 month';

    INSERT INTO seller_subscriptions (
        user_id, subscription_type, amount, payment_reference, starts_at, expires_at, status
    ) VALUES (
        p_user_id, 'monthly', 1000.00, p_payment_reference, NOW(), new_expires_date, 'active'
    );

    UPDATE profiles
    SET
        seller_subscription_expires_at = new_expires_date,
        seller_features_active = TRUE,
        seller_subscription_type = 'monthly',
        seller_last_payment_date = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO notifications (user_id, title, message, type, created_at)
    VALUES (
        p_user_id,
        'Seller Subscription Renewed',
        'Your monthly seller subscription has been renewed for ₦1,000. Valid for another 30 days.',
        'subscription_renewed',
        NOW()
    );

    RETURN TRUE;
END;
$$;

-- ============================================================================
-- 4. Naming cleanup (schema audit finding 02): usePaystack's rename is a
--    frontend/edge-function change (this migration's DB half only touches
--    the admin-payout parameter and the payment_method default above).
--    CREATE OR REPLACE FUNCTION cannot rename an existing parameter (Postgres
--    error 42P13, "cannot change name of input parameter") - the live
--    function still has p_paystack_reference from the original migration,
--    so the old signature is dropped first rather than replaced in place.
-- ============================================================================

DROP FUNCTION IF EXISTS complete_admin_withdrawal(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION complete_admin_withdrawal(
    p_withdrawal_id UUID,
    p_transfer_code TEXT,
    p_transfer_reference TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    withdrawal_amount DECIMAL(12,2);
BEGIN
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'complete_admin_withdrawal can only be called via the process-admin-payout edge function.';
    END IF;

    SELECT amount INTO withdrawal_amount
    FROM admin_withdrawals
    WHERE id = p_withdrawal_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Withdrawal not found or already processed';
    END IF;

    UPDATE admin_withdrawals
    SET
        status = 'completed',
        transfer_code = p_transfer_code,
        paystack_reference = p_transfer_reference,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_withdrawal_id;

    UPDATE admin_wallet
    SET
        total_withdrawn = total_withdrawn + withdrawal_amount,
        updated_at = NOW()
    WHERE id = (SELECT id FROM admin_wallet LIMIT 1);
END;
$$;

COMMENT ON FUNCTION create_seller_subscription IS 'service_role-only. Call via anchor-seller-payment-init/verify or the Anchor webhook handler.';
COMMENT ON FUNCTION renew_seller_subscription IS 'service_role-only. Call via anchor-seller-payment-init/verify or the Anchor webhook handler.';
COMMENT ON FUNCTION complete_admin_withdrawal IS 'service_role-only. Call via the process-admin-payout edge function.';
COMMENT ON TABLE seller_payment_intents IS 'Anchor Sub-Ledger tracking for seller registration/renewal payments. Client SELECT-own only - all writes are service_role via anchor-seller-payment-init/verify or the webhook handler.';
