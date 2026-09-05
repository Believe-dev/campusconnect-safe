-- Admin dashboard overhaul, Stage 1 (Foundation). Three independent pieces:
--
-- 1. A real platform_settings table backing the Settings tab's currently
--    fake "System Settings" card (every toggle uncontrolled, Save button had
--    no onClick at all - see Admin.tsx around the "Save Settings" button).
--    Also folds in the hardcoded WhatsApp support number from the Escrow
--    tab's dispute-contact button, and the new commission_rate_percent
--    field item 3 (commission implementation) will read at checkout time.
--
--    Column-level permission separation, not just row-level RLS: raw table
--    UPDATE is restricted to is_super_admin() only. Two narrower
--    SECURITY DEFINER functions provide the actual write paths a regular
--    admin can use - update_platform_settings() can only touch the
--    non-financial columns (its parameter list structurally excludes
--    commission_rate_percent), gated on the existing 'settings' tab_key.
--    update_commission_rate() is the only way to touch the commission
--    column, gated on a brand new 'commission_settings' tab_key - which
--    needs zero schema change to introduce, since admin_permissions.tab_key
--    is a plain TEXT column with no CHECK constraint on its value set. A
--    regular admin granted 'settings' (a fairly mundane permission, likely
--    to be handed out for things like broadcasting notifications) still has
--    no code path capable of changing the commission rate unless also
--    separately granted 'commission_settings' - both default withheld,
--    same as escrow/wallet/subscriptions already are today (confirmed: no
--    code path auto-grants any tab_key to a newly-created admin - a
--    Super Admin opts each tab in individually via the existing Staff
--    Access checkboxes).
--
-- 2. dispute_notification_templates real edit - the Templates tab's Edit
--    dialog currently has a literal "// Mock update since table doesn't
--    exist" comment and never writes anything; the table genuinely exists
--    and the View half already reads from it for real.
--
-- 3. admin_delete_user() - replaces the Users tab's "Delete User" action,
--    which today only deletes the profiles row (comment: "Since
--    delete_user_completely function doesn't exist, we'll handle this
--    manually") despite its confirmation text claiming to delete "all
--    data". A true cascading hard-delete was considered and rejected: this
--    platform holds real escrow funds, disputes, and order history, and
--    profiles.user_id / orders.buyer_id / orders.seller_id / products.seller_id
--    all reference auth.users(id) with ON DELETE CASCADE already - actually
--    deleting the auth.users row would cascade-destroy the profile and,
--    through it, every order/product/message tied to it, which is exactly
--    the "some other user's legitimate transaction/dispute record vanishes"
--    problem this is meant to avoid, not a fix for the current bug.
--    admin_delete_user() instead anonymizes profiles (PII scrubbed, kept as
--    a row so orders/products/messages/reviews keep a valid reference),
--    permanently bans (reusing the same is_banned flag ban_user()/
--    unban_user() already use - no new access-control mechanism), and
--    deactivates their product listings. auth.users is deliberately left
--    alone. Gated identically to ban_user()/unban_user() (has_admin_permission
--    'users').
--
--    Separately, and out of scope for this migration: researching this
--    surfaced that the existing self-service "Delete My Account" feature
--    (Settings -> Profile -> delete-account edge function) does exactly the
--    dangerous hard-cascading-delete this migration avoids for the admin
--    path - it hard-deletes orders, escrow_transactions, and
--    payout_requests for both buyer_id and seller_id matches, then the auth
--    user, unconditionally. That's a live, real risk independent of this
--    admin dashboard work and worth a dedicated follow-up.

-- ============================================================================
-- 1. platform_settings
-- ============================================================================

CREATE TABLE public.platform_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  allow_new_registrations BOOLEAN NOT NULL DEFAULT true,
  require_email_verification BOOLEAN NOT NULL DEFAULT false,
  enable_product_moderation BOOLEAN NOT NULL DEFAULT false,
  commission_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  minimum_order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  support_whatsapp_number TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO public.platform_settings (id, support_whatsapp_number)
VALUES (1, '2349133054018'); -- the number that was hardcoded in the Escrow dispute button

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins with settings access can view platform settings"
  ON public.platform_settings FOR SELECT
  USING (public.has_admin_permission(auth.uid(), 'settings') OR public.is_super_admin(auth.uid()));

-- Direct table writes require super_admin - the two functions below are the
-- only write path for a regular (non-super) admin, and each is scoped to a
-- specific subset of columns.
CREATE POLICY "Only super admins can write platform settings directly"
  ON public.platform_settings FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_platform_settings(
  p_allow_new_registrations BOOLEAN,
  p_require_email_verification BOOLEAN,
  p_enable_product_moderation BOOLEAN,
  p_minimum_order_value NUMERIC,
  p_support_whatsapp_number TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_admin_permission(auth.uid(), 'settings') THEN
    RAISE EXCEPTION 'You do not have permission to change platform settings.';
  END IF;

  UPDATE public.platform_settings
  SET
    allow_new_registrations = p_allow_new_registrations,
    require_email_verification = p_require_email_verification,
    enable_product_moderation = p_enable_product_moderation,
    minimum_order_value = p_minimum_order_value,
    support_whatsapp_number = p_support_whatsapp_number,
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_commission_rate(p_rate NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_admin_permission(auth.uid(), 'commission_settings') THEN
    RAISE EXCEPTION 'You do not have permission to change the commission rate.';
  END IF;

  IF p_rate < 0 OR p_rate > 50 THEN
    RAISE EXCEPTION 'Commission rate must be between 0%% and 50%%.';
  END IF;

  UPDATE public.platform_settings
  SET commission_rate_percent = p_rate, updated_at = now(), updated_by = auth.uid()
  WHERE id = 1;
END;
$$;

-- ============================================================================
-- 2. dispute_notification_templates - real edit
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_dispute_template(
  p_template_id UUID,
  p_template_name TEXT,
  p_subject TEXT,
  p_message TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_admin_permission(auth.uid(), 'templates') THEN
    RAISE EXCEPTION 'You do not have permission to edit dispute templates.';
  END IF;

  UPDATE public.dispute_notification_templates
  SET template_name = p_template_name, subject = p_subject, message = p_message, updated_at = now()
  WHERE id = p_template_id;
END;
$$;

-- ============================================================================
-- 3. admin_delete_user - anonymize + permanently ban + deactivate listings.
--    Does not touch auth.users (see header comment for why).
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
    admin_notes = COALESCE(admin_notes || E'\n', '') || 'Account deleted by admin on ' || now()::text,
    updated_at = now()
  WHERE user_id = target_user_id;

  UPDATE public.products
  SET is_active = false, updated_at = now()
  WHERE seller_id = target_user_id;
END;
$$;

COMMENT ON FUNCTION public.admin_delete_user IS
  'Anonymizes and permanently bans a user without touching auth.users - deleting that row would cascade through profiles.user_id/orders.buyer_id/orders.seller_id/products.seller_id (all ON DELETE CASCADE) and destroy other users'' legitimate order/dispute records. Orders, products, messages, and reviews stay intact, now referencing the anonymized profile.';
