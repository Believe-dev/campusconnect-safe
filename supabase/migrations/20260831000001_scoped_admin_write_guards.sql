-- Wires has_admin_permission() into the specific write paths where a
-- UI-only restriction would be a real problem if bypassed: role changes,
-- bans, seller approval, and escrow/financial actions. Deliberately not
-- touching the other ~12 admin tabs' RLS - those stay on the existing
-- broad is_admin() boundary, unchanged, per the agreed scope.

-- ============================================================================
-- 1. assign_user_role - replaces the raw user_roles insert/delete that used
--    to live in Admin.tsx's updateUserRole. This is the highest-priority fix
--    of the four: RLS on user_roles only ever checked is_admin(), so any
--    admin could previously call the client directly and grant themselves
--    'admin' (or even 'super_admin') even though the frontend dropdown hid
--    that option. Granting admin/super_admin now requires is_super_admin()
--    specifically; granting buyer/seller requires the 'users' tab grant.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assign_user_role(target_user_id UUID, new_role TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new_role NOT IN ('admin', 'seller', 'buyer') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  IF new_role = 'admin' THEN
    IF NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only a super admin can grant the admin role.';
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Admins can sell - matches the original behavior.
    UPDATE public.profiles SET account_type = 'seller' WHERE user_id = target_user_id;
  ELSE
    IF NOT public.has_admin_permission(auth.uid(), 'users') THEN
      RAISE EXCEPTION 'You do not have permission to change user roles.';
    END IF;

    -- buyer/seller is the account type - replace any existing buyer/seller
    -- row only; a separate admin grant (if any) on this user is untouched.
    DELETE FROM public.user_roles
    WHERE user_id = target_user_id AND role IN ('buyer', 'seller');

    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, new_role::app_role);

    UPDATE public.profiles SET account_type = new_role WHERE user_id = target_user_id;
  END IF;
END;
$$;

-- ============================================================================
-- 2. ban_user / unban_user - replaces raw profiles.update({is_banned}) calls.
--    Deliberately narrow (only touches is_banned/admin_notes), not a rewrite
--    of the whole profiles UPDATE policy - profiles is written to from many
--    other tabs' flows this pass isn't touching, and tab-scoping the entire
--    table would risk breaking those.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ban_user(target_user_id UUID, reason TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_admin_permission(auth.uid(), 'users') THEN
    RAISE EXCEPTION 'You do not have permission to ban users.';
  END IF;

  UPDATE public.profiles
  SET is_banned = true, admin_notes = COALESCE(reason, admin_notes)
  WHERE user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unban_user(target_user_id UUID, clear_notes BOOLEAN DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_admin_permission(auth.uid(), 'users') THEN
    RAISE EXCEPTION 'You do not have permission to unban users.';
  END IF;

  UPDATE public.profiles
  SET is_banned = false, admin_notes = CASE WHEN clear_notes THEN NULL ELSE admin_notes END
  WHERE user_id = target_user_id;
END;
$$;

-- ============================================================================
-- 3. approve_seller / reject_seller - extend the existing is_admin() check
--    with the 'sellers' tab grant. Bodies otherwise unchanged from
--    20260826000001_lock_down_security_definer_functions.sql.
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_seller(seller_user_id UUID, admin_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin(auth.uid()) OR NOT public.has_admin_permission(auth.uid(), 'sellers') THEN
        RAISE EXCEPTION 'You do not have permission to approve a seller.';
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
    IF NOT public.is_admin(auth.uid()) OR NOT public.has_admin_permission(auth.uid(), 'sellers') THEN
        RAISE EXCEPTION 'You do not have permission to reject a seller.';
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
-- 4. disputes RLS - tighten the existing admin policy to also require the
--    'escrow' tab grant. Narrow, single-purpose table (unlike profiles),
--    so tightening the policy directly is lower-risk here. Only this named
--    policy is touched - any buyer/seller-facing policies on disputes are
--    untouched.
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all disputes" ON public.disputes;

CREATE POLICY "Admins can manage all disputes" ON public.disputes FOR ALL
  USING (public.has_admin_permission(auth.uid(), 'escrow'))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'escrow'));

-- ============================================================================
-- 5. admin_approve_payout_request / admin_reject_payout_request - replaces
--    the three unwrapped client writes (wallets, payout_requests,
--    wallet_transactions) in Admin.tsx's processPayoutRequest. Same business
--    logic (balance check, transfer code, manual-transfer notes), now
--    atomic (FOR UPDATE row locks + single transaction) and gated on the
--    'escrow' tab grant - closing both the permission gap and a pre-existing
--    non-atomicity issue in the same change.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_approve_payout_request(
  p_payout_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout RECORD;
  v_wallet RECORD;
  v_transfer_code TEXT;
  v_admin_notes TEXT;
BEGIN
  IF NOT public.has_admin_permission(auth.uid(), 'escrow') THEN
    RAISE EXCEPTION 'You do not have permission to process payout requests.';
  END IF;

  SELECT * INTO v_payout FROM public.payout_requests WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout request not found.';
  END IF;
  IF v_payout.status <> 'pending' THEN
    RAISE EXCEPTION 'Payout request status is ''%'', not ''pending''.', v_payout.status;
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE id = v_payout.wallet_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found.';
  END IF;
  IF v_wallet.available_balance < v_payout.amount THEN
    RAISE EXCEPTION 'Insufficient balance: % < %', v_wallet.available_balance, v_payout.amount;
  END IF;

  v_transfer_code := 'MANUAL_' || extract(epoch FROM now())::bigint || '_' || substr(p_payout_id::text, 1, 8);
  v_admin_notes := COALESCE(
    p_notes,
    'Manual transfer approved by admin. Transfer ' || v_payout.amount || ' to ' || v_payout.bank_account_name ||
      ' (' || v_payout.bank_name || ') - Account: ' || v_payout.bank_account_number || '. Reference: ' || v_transfer_code
  );

  UPDATE public.wallets
  SET available_balance = available_balance - v_payout.amount, updated_at = now()
  WHERE id = v_payout.wallet_id;

  UPDATE public.payout_requests
  SET
    status = 'approved',
    processed_at = now(),
    processed_by = auth.uid(),
    admin_notes = v_admin_notes,
    transfer_code = v_transfer_code,
    transfer_status = 'manual_pending'
  WHERE id = p_payout_id;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, description, reference_id, reference_type, status
  ) VALUES (
    v_payout.wallet_id,
    v_payout.user_id,
    'payout',
    -v_payout.amount,
    'Manual payout approved - ' || v_payout.bank_account_name || ' (' || v_payout.bank_name || ') - Ref: ' || v_transfer_code,
    p_payout_id,
    'manual_transfer',
    'completed'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_payout_request(
  p_payout_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_admin_permission(auth.uid(), 'escrow') THEN
    RAISE EXCEPTION 'You do not have permission to process payout requests.';
  END IF;

  UPDATE public.payout_requests
  SET
    status = 'rejected',
    admin_notes = COALESCE(p_notes, 'Payout request rejected by admin'),
    processed_by = auth.uid(),
    processed_at = now()
  WHERE id = p_payout_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout request not found or already processed.';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assign_user_role IS 'Requires users tab grant for buyer/seller; super_admin only for admin role.';
COMMENT ON FUNCTION public.ban_user IS 'Requires users tab grant.';
COMMENT ON FUNCTION public.unban_user IS 'Requires users tab grant.';
COMMENT ON FUNCTION public.admin_approve_payout_request IS 'Requires escrow tab grant. Atomic: row-locks payout_requests and wallets for the duration.';
COMMENT ON FUNCTION public.admin_reject_payout_request IS 'Requires escrow tab grant.';
