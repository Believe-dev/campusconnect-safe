-- Fixes the same hard-cascading-delete risk Stage 1 (20260906000001) already
-- designed around for the admin dashboard's Delete Account action, but for
-- the actual live self-service path.
--
-- The "delete-account" edge function is NOT what runs when a user deletes
-- their own account today - confirmed via exhaustive grep, nothing in src/
-- calls it. Profile.tsx's handleDeleteAccount calls
-- supabase.rpc("delete_user_completely") instead, a real, deployed,
-- authenticated-callable function (GRANT EXECUTE ... TO authenticated) that
-- hard-deletes wallet_transactions, disputes, payout_requests,
-- escrow_transactions, reviews, messages, conversations, orders (both
-- buyer_id and seller_id matches), products, then auth.users -
-- unconditionally, for ANY logged-in user calling it on themselves. Exactly
-- the same "destroys another party's legitimate transaction/dispute
-- record" problem admin_delete_user was built to avoid, except this one is
-- live and user-triggered right now.
--
-- Fix mirrors Stage 1 exactly: extract the actual anonymize/ban/deactivate
-- logic into one shared function so admin_delete_user and the self-service
-- path are provably doing the same thing, not two parallel
-- reimplementations that could drift. delete_user_completely() keeps its
-- exact name and signature - Profile.tsx needs zero RPC-call changes for
-- this half of the fix.
--
-- auth.users is still deliberately not deleted here, for the identical
-- reason as Stage 1: profiles.user_id / orders.buyer_id / orders.seller_id /
-- products.seller_id all reference it ON DELETE CASCADE, so deleting it
-- would cascade-destroy the very order/escrow/payout records this migration
-- exists to protect. Actually scrubbing the real credential (so it can
-- never be used to log back in) needs the Auth Admin API, which requires
-- service-role access - not available from a plain Postgres function - so
-- that part is a separate edge-function step (see
-- supabase/functions/delete-account/index.ts, repurposed rather than left
-- dead) called from Profile.tsx right after this RPC succeeds.

-- ============================================================================
-- 1. Shared core - no permission check inside. Callers (admin_delete_user,
--    delete_user_completely) are responsible for authorizing before calling
--    this. EXECUTE is revoked from authenticated/anon/PUBLIC below so it
--    can't be invoked directly, bypassing those checks - the two wrapper
--    functions can still call it because SECURITY DEFINER functions run
--    with their owner's privileges, not the original client's.
-- ============================================================================

CREATE OR REPLACE FUNCTION public._anonymize_and_deactivate_account(target_user_id UUID, p_note TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    full_name = 'Deleted User',
    email = 'deleted-' || target_user_id::text || '@deleted.unimarket.com.ng',
    phone_number = NULL,
    avatar_url = NULL,
    face_photo_url = NULL,
    bio = NULL,
    business_name = NULL,
    student_id = NULL,
    university_name = NULL,
    campus = NULL,
    bank_account_name = NULL,
    bank_account_number = NULL,
    bank_name = NULL,
    onesignal_player_id = NULL,
    date_of_birth = NULL,
    is_banned = true,
    admin_notes = COALESCE(admin_notes || E'\n', '') || p_note,
    updated_at = now()
  WHERE user_id = target_user_id;

  UPDATE public.products
  SET is_active = false, updated_at = now()
  WHERE seller_id = target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._anonymize_and_deactivate_account(UUID, TEXT) FROM PUBLIC, authenticated, anon;

-- ============================================================================
-- 2. admin_delete_user - refactored to delegate to the shared core.
--    Same permission gate and behavior as Stage 1, just no longer a
--    standalone copy of the UPDATE statements.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_admin_permission(auth.uid(), 'users') THEN
    RAISE EXCEPTION 'You do not have permission to delete users.';
  END IF;

  PERFORM public._anonymize_and_deactivate_account(
    target_user_id,
    'Account deleted by admin on ' || now()::text
  );
END;
$$;

-- ============================================================================
-- 3. delete_user_completely - the actual live self-service path. Keeps its
--    exact original name/signature/return type/exception-swallowing
--    behavior (RETURNS boolean, false on any error) so Profile.tsx's
--    existing call site needs no changes. No permission check needed beyond
--    being authenticated (auth.uid() IS NULL guard) - this only ever
--    targets the caller's own account, there is no target_user_id
--    parameter to abuse.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_completely()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    PERFORM public._anonymize_and_deactivate_account(
      current_user_id,
      'Account self-deleted by user on ' || now()::text
    );

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

COMMENT ON FUNCTION public.delete_user_completely IS
  'Anonymizes and permanently bans the calling user''s own account - does not touch auth.users (see _anonymize_and_deactivate_account) to avoid cascade-destroying their orders/escrow/payout history, which other users still need. The real auth credential is separately scrubbed by the delete-account edge function, called from Profile.tsx right after this succeeds.';
