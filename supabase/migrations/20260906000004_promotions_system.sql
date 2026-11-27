-- "3-Second Cart Dash" promotions system (Group 4, item 1).
--
-- Deliberately fully decoupled from the real commerce path: no orders,
-- escrow_transactions, cart, or Anchor call anywhere in this migration.
-- Grabs are free (no payment), fulfilled manually by admin staff, and live
-- in their own promo_grabs table specifically so promo activity can never
-- pollute GMV/commission/payout reporting - there's no shared table to
-- accidentally include in those queries.
--
-- Permission fit: new 'promotions' tab_key (delegatable like every other
-- admin tab). The commission toggle below is a separate, harder gate -
-- checked via is_super_admin() directly, not delegatable through
-- 'promotions' or even 'commission_settings', since it was explicitly asked
-- for as Super-Admin-only with no exceptions.

-- ============================================================================
-- 1. Tables
-- ============================================================================

CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration_seconds INT NOT NULL DEFAULT 3 CHECK (duration_seconds > 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'live', 'disabled', 'ended')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_promotions_status ON public.promotions(status);

CREATE TABLE public.promo_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  -- Nullable = uncapped. Deliberately separate from products.stock_quantity -
  -- grabs never touch the seller's real inventory count, confirmed
  -- intentional: fulfillment is manual and sourced separately from normal
  -- marketplace stock.
  stock_limit INT CHECK (stock_limit IS NULL OR stock_limit > 0),
  claimed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (promotion_id, product_id)
);

CREATE INDEX idx_promo_products_promotion ON public.promo_products(promotion_id);

CREATE TABLE public.promo_grabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  promo_product_id UUID NOT NULL REFERENCES public.promo_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'pending_fulfillment'
    CHECK (status IN ('pending_fulfillment', 'shipped', 'delivered', 'cancelled')),
  -- Buyer-submitted on the post-dash confirmation page, not copied from a
  -- profile field - profiles has no persistent street/hostel address column
  -- (only `campus`), same reason orders.shipping_address is captured as
  -- free text at checkout rather than read from a fixed column.
  shipping_address TEXT,
  contact_phone TEXT,
  admin_notes TEXT,
  fulfilled_by UUID REFERENCES auth.users(id),
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One grab per item per user per promo (with a quantity), not unlimited
  -- repeat-claims of the same item.
  UNIQUE (promotion_id, promo_product_id, user_id)
);

CREATE INDEX idx_promo_grabs_promotion ON public.promo_grabs(promotion_id);
CREATE INDEX idx_promo_grabs_user ON public.promo_grabs(user_id);
CREATE INDEX idx_promo_grabs_status ON public.promo_grabs(status);

CREATE TABLE public.promo_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  UNIQUE (promotion_id, user_id)
);

CREATE INDEX idx_promo_reminders_promotion ON public.promo_reminders(promotion_id);

-- Future use only - off by default, not read by any checkout/grab logic in
-- this migration. A later feature can check this before ever charging
-- anything on a promo grab.
ALTER TABLE public.platform_settings
  ADD COLUMN promotions_commission_enabled BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- 2. RLS
-- ============================================================================

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_grabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_reminders ENABLE ROW LEVEL SECURITY;

-- Buyers see scheduled/live/ended only - draft and disabled are admin-only
-- previews/retractions, never shown as if they were real past promos.
CREATE POLICY "Buyers view visible promotions" ON public.promotions
  FOR SELECT USING (status IN ('scheduled', 'live', 'ended'));

CREATE POLICY "Admins view all promotions" ON public.promotions
  FOR SELECT USING (public.has_admin_permission(auth.uid(), 'promotions') OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins write promotions" ON public.promotions
  FOR INSERT WITH CHECK (public.has_admin_permission(auth.uid(), 'promotions') OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins update promotions" ON public.promotions
  FOR UPDATE USING (public.has_admin_permission(auth.uid(), 'promotions') OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins delete draft promotions" ON public.promotions
  FOR DELETE USING (
    status = 'draft'
    AND (public.has_admin_permission(auth.uid(), 'promotions') OR public.is_super_admin(auth.uid()))
  );

CREATE POLICY "Buyers view products of visible promotions" ON public.promo_products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.promotions p WHERE p.id = promotion_id AND p.status IN ('scheduled', 'live', 'ended'))
  );

CREATE POLICY "Admins manage promo products" ON public.promo_products
  FOR ALL USING (public.has_admin_permission(auth.uid(), 'promotions') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'promotions') OR public.is_super_admin(auth.uid()));

-- No INSERT policy for buyers at all on promo_grabs - the only write path is
-- grab_promo_item() below, which runs as SECURITY DEFINER and re-validates
-- everything server-side regardless of what a client believes the countdown
-- state is.
CREATE POLICY "Buyers view own grabs" ON public.promo_grabs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Buyers update own grab shipping details" ON public.promo_grabs
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending_fulfillment')
  WITH CHECK (auth.uid() = user_id AND status = 'pending_fulfillment');

CREATE POLICY "Admins view all grabs" ON public.promo_grabs
  FOR SELECT USING (public.has_admin_permission(auth.uid(), 'promotions') OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins update grabs" ON public.promo_grabs
  FOR UPDATE USING (public.has_admin_permission(auth.uid(), 'promotions') OR public.is_super_admin(auth.uid()));

CREATE POLICY "Buyers manage own reminders" ON public.promo_reminders
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all reminders" ON public.promo_reminders
  FOR SELECT USING (public.has_admin_permission(auth.uid(), 'promotions') OR public.is_super_admin(auth.uid()));

-- ============================================================================
-- 3. Buyer-facing function: the concurrency-critical grab path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.grab_promo_item(
  p_promotion_id UUID,
  p_promo_product_id UUID,
  p_quantity INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo_status TEXT;
  v_stock_limit INT;
  v_claimed_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_quantity < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid quantity');
  END IF;

  -- Row lock on the specific promo_product serializes concurrent grabs for
  -- THIS item only - buyers grabbing different items in the same promo at
  -- the same instant don't block each other.
  SELECT pp.stock_limit, pp.claimed_count, p.status
    INTO v_stock_limit, v_claimed_count, v_promo_status
  FROM public.promo_products pp
  JOIN public.promotions p ON p.id = pp.promotion_id
  WHERE pp.id = p_promo_product_id AND pp.promotion_id = p_promotion_id
  FOR UPDATE OF pp;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found in this promotion');
  END IF;

  -- The only authority on enterability. Never trust the caller's belief
  -- that a countdown is still running - a stalled client timer, a replayed
  -- request, or a promo an admin just disabled must all be rejected here.
  IF v_promo_status <> 'live' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This promotion is not currently live');
  END IF;

  IF v_stock_limit IS NOT NULL AND v_claimed_count + p_quantity > v_stock_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'This item is fully claimed');
  END IF;

  BEGIN
    INSERT INTO public.promo_grabs (promotion_id, promo_product_id, user_id, quantity)
    VALUES (p_promotion_id, p_promo_product_id, auth.uid(), p_quantity);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'You already grabbed this item');
  END;

  UPDATE public.promo_products
  SET claimed_count = claimed_count + p_quantity
  WHERE id = p_promo_product_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.grab_promo_item(UUID, UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grab_promo_item(UUID, UUID, INT) TO authenticated;

-- Called once from the post-dash confirmation page to attach shipping
-- details to every grab the buyer just made in this promotion, rather than
-- collecting an address on every single rapid-fire grab call.
CREATE OR REPLACE FUNCTION public.submit_promo_shipping_details(
  p_promotion_id UUID,
  p_shipping_address TEXT,
  p_contact_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_shipping_address IS NULL OR trim(p_shipping_address) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shipping address is required');
  END IF;

  UPDATE public.promo_grabs
  SET shipping_address = p_shipping_address, contact_phone = p_contact_phone
  WHERE promotion_id = p_promotion_id AND user_id = auth.uid() AND status = 'pending_fulfillment';

  RETURN jsonb_build_object('success', true, 'updated', (SELECT count(*) FROM public.promo_grabs WHERE promotion_id = p_promotion_id AND user_id = auth.uid()));
END;
$$;

REVOKE ALL ON FUNCTION public.submit_promo_shipping_details(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_promo_shipping_details(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 4. Admin functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_create_promotion(
  p_title TEXT,
  p_description TEXT,
  p_duration_seconds INT,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_product_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promotion_id UUID;
  v_product_id UUID;
BEGIN
  IF NOT (public.has_admin_permission(auth.uid(), 'promotions') OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'You do not have permission to manage promotions.';
  END IF;

  INSERT INTO public.promotions (title, description, duration_seconds, starts_at, ends_at, created_by, status)
  VALUES (p_title, p_description, COALESCE(p_duration_seconds, 3), p_starts_at, p_ends_at, auth.uid(), 'draft')
  RETURNING id INTO v_promotion_id;

  FOREACH v_product_id IN ARRAY p_product_ids LOOP
    INSERT INTO public.promo_products (promotion_id, product_id)
    VALUES (v_promotion_id, v_product_id)
    ON CONFLICT (promotion_id, product_id) DO NOTHING;
  END LOOP;

  RETURN v_promotion_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_promotion(TEXT, TEXT, INT, TIMESTAMPTZ, TIMESTAMPTZ, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_promotion(TEXT, TEXT, INT, TIMESTAMPTZ, TIMESTAMPTZ, UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_promotion(
  p_promotion_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_duration_seconds INT,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_product_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id UUID;
BEGIN
  IF NOT (public.has_admin_permission(auth.uid(), 'promotions') OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'You do not have permission to manage promotions.';
  END IF;

  UPDATE public.promotions
  SET title = p_title,
      description = p_description,
      duration_seconds = COALESCE(p_duration_seconds, duration_seconds),
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      updated_at = now()
  WHERE id = p_promotion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promotion not found.';
  END IF;

  -- Full replace, simplest correct option for an admin-facing product
  -- picker (no diffing needed) - existing claimed_count on any product kept
  -- in the new list is preserved since it's an ON CONFLICT DO NOTHING
  -- upsert-style delete-only-of-removed-rows, not a blanket delete+reinsert.
  DELETE FROM public.promo_products
  WHERE promotion_id = p_promotion_id AND product_id <> ALL(p_product_ids);

  FOREACH v_product_id IN ARRAY p_product_ids LOOP
    INSERT INTO public.promo_products (promotion_id, product_id)
    VALUES (p_promotion_id, v_product_id)
    ON CONFLICT (promotion_id, product_id) DO NOTHING;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_promotion(UUID, TEXT, TEXT, INT, TIMESTAMPTZ, TIMESTAMPTZ, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_promotion(UUID, TEXT, TEXT, INT, TIMESTAMPTZ, TIMESTAMPTZ, UUID[]) TO authenticated;

-- Deliberately no state-machine restriction on which status can follow
-- which - the whole point is an admin can turn any promotion on/off at any
-- time, including reactivating one that already ended.
CREATE OR REPLACE FUNCTION public.admin_set_promotion_status(
  p_promotion_id UUID,
  p_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_admin_permission(auth.uid(), 'promotions') OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'You do not have permission to manage promotions.';
  END IF;

  IF p_status NOT IN ('draft', 'scheduled', 'live', 'disabled', 'ended') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  UPDATE public.promotions
  SET status = p_status, updated_at = now()
  WHERE id = p_promotion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promotion not found.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_promotion_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_promotion_status(UUID, TEXT) TO authenticated;

-- Fulfillment queue actions. Cancelling notifies the buyer with the admin's
-- reason (same reason-required rule as every other reject/deny action this
-- project applies); shipped/delivered are informational, best-effort,
-- non-blocking notifications (never fail the real status change if the
-- notification insert has a problem).
CREATE OR REPLACE FUNCTION public.admin_update_promo_grab_status(
  p_grab_id UUID,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT (public.has_admin_permission(auth.uid(), 'promotions') OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'You do not have permission to manage promotions.';
  END IF;

  IF p_status NOT IN ('pending_fulfillment', 'shipped', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  IF p_status = 'cancelled' AND (p_reason IS NULL OR trim(p_reason) = '') THEN
    RAISE EXCEPTION 'A reason is required to cancel a grab.';
  END IF;

  UPDATE public.promo_grabs
  SET status = p_status,
      admin_notes = COALESCE(p_reason, admin_notes),
      fulfilled_by = CASE WHEN p_status IN ('shipped', 'delivered') THEN auth.uid() ELSE fulfilled_by END,
      fulfilled_at = CASE WHEN p_status IN ('shipped', 'delivered') THEN now() ELSE fulfilled_at END
  WHERE id = p_grab_id
  RETURNING user_id INTO v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Grab not found.';
  END IF;

  BEGIN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_user_id,
      CASE p_status
        WHEN 'shipped' THEN 'Your promo item has shipped! 📦'
        WHEN 'delivered' THEN 'Your promo item was delivered'
        WHEN 'cancelled' THEN 'Your promo grab was cancelled'
        ELSE 'Promo grab update'
      END,
      CASE p_status
        WHEN 'shipped' THEN 'The item you grabbed is on its way to you.'
        WHEN 'delivered' THEN 'The item you grabbed has been marked as delivered.'
        WHEN 'cancelled' THEN 'Your promo grab was cancelled. Reason: ' || COALESCE(p_reason, 'Not specified')
        ELSE 'Your promo grab status changed.'
      END,
      'info'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send promo grab notification: %', SQLERRM;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_promo_grab_status(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_promo_grab_status(UUID, TEXT, TEXT) TO authenticated;

-- Hard Super-Admin-only gate, deliberately not routed through
-- has_admin_permission()/'commission_settings' at all - asked for as
-- Super-Admin-only with no delegation path, unlike the existing (delegatable)
-- commission rate control.
CREATE OR REPLACE FUNCTION public.update_promotions_commission_toggle(
  p_enabled BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only a Super Admin can change this setting.';
  END IF;

  UPDATE public.platform_settings
  SET promotions_commission_enabled = p_enabled, updated_at = now(), updated_by = auth.uid()
  WHERE id = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.update_promotions_commission_toggle(BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_promotions_commission_toggle(BOOLEAN) TO authenticated;

-- ============================================================================
-- 5. Scheduled sweep: automatic scheduled->live->ended transitions, and
--    start-time reminders. Never touches 'draft' or 'disabled' rows - those
--    only ever change via explicit admin action, so a manual disable can
--    never be silently undone by the clock.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sweep_promotions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo RECORD;
  v_reminder RECORD;
BEGIN
  FOR v_promo IN
    UPDATE public.promotions
    SET status = 'live', updated_at = now()
    WHERE status = 'scheduled' AND starts_at IS NOT NULL AND starts_at <= now()
    RETURNING id
  LOOP
    FOR v_reminder IN
      SELECT id, user_id FROM public.promo_reminders
      WHERE promotion_id = v_promo.id AND notified_at IS NULL
    LOOP
      BEGIN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
          v_reminder.user_id,
          'A promo you set a reminder for just went live! ⚡',
          'Grab as much as you can before it ends - every second counts.',
          'info'
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to send promo reminder notification: %', SQLERRM;
      END;

      UPDATE public.promo_reminders SET notified_at = now() WHERE id = v_reminder.id;
    END LOOP;
  END LOOP;

  UPDATE public.promotions
  SET status = 'ended', updated_at = now()
  WHERE status = 'live' AND ends_at IS NOT NULL AND ends_at <= now();
END;
$$;

DO $migration$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;

    PERFORM cron.unschedule('sweep-promotions')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sweep-promotions');

    PERFORM cron.schedule(
        'sweep-promotions',
        '* * * * *',
        $cron$SELECT public.sweep_promotions();$cron$
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron scheduling skipped (extension unavailable on this plan): %', SQLERRM;
END;
$migration$;
