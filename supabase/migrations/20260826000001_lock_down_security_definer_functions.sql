-- Security audit follow-up: several SECURITY DEFINER functions had no caller
-- authorization check at all, and EXECUTE on them defaults to PUBLIC in
-- Postgres unless explicitly revoked (none of these were). That means any
-- authenticated user could call them directly via supabase.rpc(...),
-- bypassing every UI-level admin/ownership check entirely. None of the
-- functions touched here are currently called from app code except
-- complete_admin_withdrawal and (indirectly) release_escrow_funds /
-- reverse_escrow_funds - but "unused today" is not "safe", since the raw
-- RPC is reachable from any authenticated client regardless of what the UI
-- currently does.

-- ============================================================================
-- 1. profiles: block self-modification of admin-controlled columns.
--    This is the primary fix - it closes the gap directly at the table level
--    (the existing "Users can update their own profile" RLS policy only
--    checks row ownership, not which columns changed) and acts as defense in
--    depth for any function below that touches these columns, including ones
--    not covered by this migration.
--    service_role is allowed through because real backend flows - KYC
--    webhook/verification (anchor-kyc-submit, anchor-webhook) - legitimately
--    set is_verified/verification_status server-side with no user JWT in
--    context (auth.uid() is NULL there, not the admin's id).
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_self_admin_field_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() = 'service_role' OR public.is_admin(auth.uid()) THEN
        RETURN NEW;
    END IF;

    IF NEW.is_banned IS DISTINCT FROM OLD.is_banned
        OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
        OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
        OR NEW.seller_status IS DISTINCT FROM OLD.seller_status
        OR NEW.seller_approved_by IS DISTINCT FROM OLD.seller_approved_by
        OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
    THEN
        RAISE EXCEPTION 'Only an admin can change moderation/verification fields on a profile.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_admin_field_update_trigger ON profiles;
CREATE TRIGGER prevent_self_admin_field_update_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_admin_field_update();

-- ============================================================================
-- 2. admin_update_user_profile: add the admin check it never had.
--    Body otherwise unchanged from 20250130000004_fix_admin_profile_updates.sql.
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_update_user_profile(
    p_user_id UUID,
    p_updates JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Deliberately outside the try/catch below: this must propagate as a
    -- hard error to the caller, not get swallowed into a quiet `false`
    -- return by the generic exception handler meant for genuine update
    -- failures.
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only an admin can update another user''s profile.';
    END IF;

    BEGIN
        UPDATE profiles
        SET
            full_name = COALESCE((p_updates->>'full_name'), full_name),
            email = COALESCE((p_updates->>'email'), email),
            university_name = COALESCE((p_updates->>'university_name'), university_name),
            bio = COALESCE((p_updates->>'bio'), bio),
            phone_number = COALESCE((p_updates->>'phone_number'), phone_number),
            student_id = COALESCE((p_updates->>'student_id'), student_id),
            rating = COALESCE((p_updates->>'rating')::DECIMAL(3,2), rating),
            total_reviews = COALESCE((p_updates->>'total_reviews')::INTEGER, total_reviews),
            is_verified = COALESCE((p_updates->>'is_verified')::BOOLEAN, is_verified),
            is_banned = COALESCE((p_updates->>'is_banned')::BOOLEAN, is_banned),
            avatar_url = COALESCE((p_updates->>'avatar_url'), avatar_url),
            admin_notes = COALESCE((p_updates->>'admin_notes'), admin_notes),
            updated_at = NOW()
        WHERE user_id = p_user_id;

        RETURN FOUND;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to update profile for user %: %', p_user_id, SQLERRM;
            RETURN FALSE;
    END;
END;
$$;

-- ============================================================================
-- 3. update_user_profile: add the ownership check it never had. A caller
--    could otherwise overwrite any other user's name/phone/bio/etc by
--    passing a different p_user_id.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_profile(
    p_user_id UUID,
    p_full_name TEXT DEFAULT NULL,
    p_phone_number TEXT DEFAULT NULL,
    p_university_name TEXT DEFAULT NULL,
    p_student_id TEXT DEFAULT NULL,
    p_bio TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Cannot update another user''s profile.';
    END IF;

    BEGIN
        UPDATE profiles
        SET
            full_name = COALESCE(p_full_name, full_name),
            phone_number = COALESCE(p_phone_number, phone_number),
            university_name = COALESCE(p_university_name, university_name),
            student_id = COALESCE(p_student_id, student_id),
            bio = COALESCE(p_bio, bio),
            avatar_url = COALESCE(p_avatar_url, avatar_url),
            updated_at = NOW()
        WHERE user_id = p_user_id;

        RETURN FOUND;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to update profile for user %: %', p_user_id, SQLERRM;
            RETURN FALSE;
    END;
END;
$$;

-- ============================================================================
-- 4. approve_seller / reject_seller: add the admin check they never had, and
--    stop trusting the admin_user_id parameter for attribution - use the
--    verified caller instead, so a non-admin can't self-approve as a seller
--    by passing an arbitrary admin_user_id.
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_seller(seller_user_id UUID, admin_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only an admin can approve a seller.';
    END IF;

    UPDATE profiles
    SET
        seller_status = 'approved',
        seller_approved_at = NOW(),
        seller_approved_by = auth.uid()
    WHERE user_id = seller_user_id;

    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
        seller_user_id,
        'Seller Account Approved! 🎉',
        'Your seller account has been approved. You can now start listing products.',
        'success'
    );
END;
$$;

CREATE OR REPLACE FUNCTION reject_seller(seller_user_id UUID, admin_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only an admin can reject a seller.';
    END IF;

    UPDATE profiles
    SET
        seller_status = 'rejected',
        seller_approved_by = auth.uid()
    WHERE user_id = seller_user_id;

    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
        seller_user_id,
        'Seller Account Rejected',
        'Your seller account application has been rejected. Please contact support for more information.',
        'warning'
    );
END;
$$;

-- ============================================================================
-- 5. release_escrow_funds / reverse_escrow_funds: restrict to service_role.
--    supabase/functions/anchor-escrow-resolve/index.ts already does the real
--    authorization (buyer-or-admin for release, admin-only for reverse) and
--    is the only caller that should ever reach these - its own header
--    comment already says so, this just enforces it at the DB layer. Bodies
--    otherwise unchanged.
-- ============================================================================

CREATE OR REPLACE FUNCTION release_escrow_funds(escrow_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    escrow_record escrow_transactions%ROWTYPE;
    seller_wallet_id UUID;
BEGIN
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'release_escrow_funds can only be called via the anchor-escrow-resolve edge function.';
    END IF;

    SELECT * INTO escrow_record FROM escrow_transactions WHERE id = escrow_id AND status = 'held';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    INSERT INTO wallets (user_id)
    VALUES (escrow_record.seller_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT id INTO seller_wallet_id FROM wallets WHERE user_id = escrow_record.seller_id;

    IF seller_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Failed to get or create wallet for seller';
    END IF;

    UPDATE escrow_transactions
    SET status = 'released', released_at = NOW(), updated_at = NOW()
    WHERE id = escrow_id;

    UPDATE wallets
    SET
        available_balance = available_balance + escrow_record.seller_amount,
        total_earnings = total_earnings + escrow_record.seller_amount,
        total_commission_paid = total_commission_paid + escrow_record.commission_amount,
        updated_at = NOW()
    WHERE user_id = escrow_record.seller_id;

    IF escrow_record.seller_amount > 0 THEN
        INSERT INTO wallet_transactions (
            wallet_id, user_id, type, amount, description, reference_id, reference_type
        ) VALUES (
            seller_wallet_id,
            escrow_record.seller_id,
            'credit',
            escrow_record.seller_amount,
            'Payment received for order',
            escrow_record.order_id,
            'order'
        );
    END IF;

    IF escrow_record.commission_amount > 0 THEN
        INSERT INTO wallet_transactions (
            wallet_id, user_id, type, amount, description, reference_id, reference_type
        ) VALUES (
            seller_wallet_id,
            escrow_record.seller_id,
            'commission',
            escrow_record.commission_amount,
            'Platform commission deducted',
            escrow_record.order_id,
            'commission'
        );
    END IF;

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION reverse_escrow_funds(escrow_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    escrow_record escrow_transactions%ROWTYPE;
    buyer_wallet_id UUID;
BEGIN
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'reverse_escrow_funds can only be called via the anchor-escrow-resolve edge function.';
    END IF;

    SELECT * INTO escrow_record FROM escrow_transactions WHERE id = escrow_id AND status = 'held';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    SELECT id INTO buyer_wallet_id FROM wallets WHERE user_id = escrow_record.buyer_id;

    UPDATE escrow_transactions
    SET status = 'refunded', updated_at = NOW()
    WHERE id = escrow_id;

    UPDATE wallets
    SET available_balance = available_balance + escrow_record.amount,
        updated_at = NOW()
    WHERE user_id = escrow_record.buyer_id;

    INSERT INTO wallet_transactions (
        wallet_id, user_id, type, amount, description, reference_id, reference_type
    ) VALUES (
        buyer_wallet_id,
        escrow_record.buyer_id,
        'refund',
        escrow_record.amount,
        'Order payment reversed to buyer (dispute resolved in buyer favor)',
        escrow_record.order_id,
        'order'
    );

    RETURN TRUE;
END;
$$;

-- ============================================================================
-- 6. Admin payout chain: restrict to service_role. These should only ever be
--    reached via process-admin-payout (being fixed alongside this migration
--    to verify the caller's JWT instead of trusting a client-supplied
--    admin_id). process_admin_withdrawal also keeps its existing
--    admin-role check on p_admin_id as defense in depth.
-- ============================================================================

CREATE OR REPLACE FUNCTION process_admin_withdrawal(
    p_admin_id UUID,
    p_amount DECIMAL(12,2),
    p_bank_name TEXT,
    p_account_number TEXT,
    p_account_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    withdrawal_id UUID;
    current_balance DECIMAL(12,2);
BEGIN
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'process_admin_withdrawal can only be called via the process-admin-payout edge function.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = p_admin_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can withdraw funds';
    END IF;

    SELECT available_balance INTO current_balance
    FROM admin_wallet
    WHERE id = (SELECT id FROM admin_wallet LIMIT 1);

    IF current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Requested: %', current_balance, p_amount;
    END IF;

    INSERT INTO admin_withdrawals (
        admin_id, amount, bank_name, account_number, account_name
    ) VALUES (
        p_admin_id, p_amount, p_bank_name, p_account_number, p_account_name
    ) RETURNING id INTO withdrawal_id;

    UPDATE admin_wallet
    SET
        available_balance = available_balance - p_amount,
        updated_at = NOW()
    WHERE id = (SELECT id FROM admin_wallet LIMIT 1);

    RETURN withdrawal_id;
END;
$$;

CREATE OR REPLACE FUNCTION complete_admin_withdrawal(
    p_withdrawal_id UUID,
    p_transfer_code TEXT,
    p_paystack_reference TEXT
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
        paystack_reference = p_paystack_reference,
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

CREATE OR REPLACE FUNCTION fail_admin_withdrawal(
    p_withdrawal_id UUID,
    p_error_message TEXT DEFAULT NULL
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
        RAISE EXCEPTION 'fail_admin_withdrawal can only be called via the process-admin-payout edge function.';
    END IF;

    SELECT amount INTO withdrawal_amount
    FROM admin_withdrawals
    WHERE id = p_withdrawal_id AND status IN ('pending', 'processing');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Withdrawal not found or already processed';
    END IF;

    UPDATE admin_withdrawals
    SET
        status = 'failed',
        updated_at = NOW()
    WHERE id = p_withdrawal_id;

    UPDATE admin_wallet
    SET
        available_balance = available_balance + withdrawal_amount,
        updated_at = NOW()
    WHERE id = (SELECT id FROM admin_wallet LIMIT 1);
END;
$$;

CREATE OR REPLACE FUNCTION update_admin_wallet_commission(commission_amount DECIMAL(12,2))
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'update_admin_wallet_commission can only be called from trusted server-side code.';
    END IF;

    UPDATE admin_wallet
    SET
        total_commissions = total_commissions + commission_amount,
        available_balance = available_balance + commission_amount,
        updated_at = NOW()
    WHERE id = (SELECT id FROM admin_wallet LIMIT 1);
END;
$$;

COMMENT ON FUNCTION admin_update_user_profile IS 'Admin-only. Requires is_admin(auth.uid()).';
COMMENT ON FUNCTION update_user_profile IS 'Self-only. Requires auth.uid() = p_user_id.';
COMMENT ON FUNCTION approve_seller IS 'Admin-only. Requires is_admin(auth.uid()); attribution uses auth.uid(), not the admin_user_id param.';
COMMENT ON FUNCTION reject_seller IS 'Admin-only. Requires is_admin(auth.uid()); attribution uses auth.uid(), not the admin_user_id param.';
COMMENT ON FUNCTION release_escrow_funds IS 'service_role-only. Call via the anchor-escrow-resolve edge function, which does the real buyer/admin authorization.';
COMMENT ON FUNCTION reverse_escrow_funds IS 'service_role-only. Call via the anchor-escrow-resolve edge function, which does the real admin-only authorization.';
COMMENT ON FUNCTION process_admin_withdrawal IS 'service_role-only. Call via the process-admin-payout edge function.';
COMMENT ON FUNCTION complete_admin_withdrawal IS 'service_role-only. Call via the process-admin-payout edge function.';
COMMENT ON FUNCTION fail_admin_withdrawal IS 'service_role-only. Call via the process-admin-payout edge function.';
COMMENT ON FUNCTION update_admin_wallet_commission IS 'service_role-only. Call from trusted server-side code only.';
