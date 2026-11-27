-- Extends the promotions system (20260906000004):
--   1. Per-promotion commission toggle, additive alongside the existing
--      platform-wide platform_settings.promotions_commission_enabled - both
--      are inert flags today (no checkout/commission logic reads either
--      yet), but the intended future relationship is AND: a promo only ever
--      charges commission if the platform master switch AND that specific
--      promotion's switch are both on.
--   2. promo_type, for future promo formats beyond the 3-second dash -
--      schema-only, no new format is implemented in this migration.
--   3. banner_image_url, shown on the Marketplace banner carousel and the
--      entry modal.
--   4. Custom (non-catalog) products - promo_products.product_id becomes
--      optional, with custom_title/custom_price/custom_image_url as the
--      alternative. admin_create_promotion/admin_update_promotion are
--      replaced to take a JSONB product list instead of a plain UUID array,
--      since each entry can now be "use this real product" or "here's a
--      custom one".

-- ============================================================================
-- 1. promotions: new columns
-- ============================================================================

ALTER TABLE public.promotions
  ADD COLUMN promo_type TEXT NOT NULL DEFAULT 'cart_dash',
  ADD COLUMN commission_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN banner_image_url TEXT;

-- ============================================================================
-- 2. promo_products: optional product_id + custom fields
-- ============================================================================

ALTER TABLE public.promo_products
  ALTER COLUMN product_id DROP NOT NULL,
  ADD COLUMN custom_title TEXT,
  ADD COLUMN custom_price NUMERIC(10,2),
  ADD COLUMN custom_image_url TEXT,
  ADD CONSTRAINT promo_products_real_or_custom CHECK (
    product_id IS NOT NULL
    OR (custom_title IS NOT NULL AND custom_image_url IS NOT NULL)
  );

-- UNIQUE (promotion_id, product_id) from 20260906000004 is untouched and
-- still does the right thing: Postgres treats each NULL product_id as
-- distinct from every other NULL, so any number of custom products can
-- coexist in one promotion while a real product still can't be added twice.

-- ============================================================================
-- 3. Per-promotion commission toggle - hard Super-Admin-only, same as the
--    platform-wide one, deliberately not routed through has_admin_permission()
--    at all.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_promotion_commission(
  p_promotion_id UUID,
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

  UPDATE public.promotions
  SET commission_enabled = p_enabled, updated_at = now()
  WHERE id = p_promotion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promotion not found.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_promotion_commission(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_promotion_commission(UUID, BOOLEAN) TO authenticated;

-- ============================================================================
-- 4. admin_create_promotion / admin_update_promotion - replaced to accept a
--    JSONB product list. Each element:
--      { "id": "<promo_products.id, only on update, omit/null when new>",
--        "product_id": "<uuid, or null for a custom item>",
--        "custom_title": "...", "custom_price": ..., "custom_image_url": "..." }
-- ============================================================================

DROP FUNCTION IF EXISTS public.admin_create_promotion(TEXT, TEXT, INT, TIMESTAMPTZ, TIMESTAMPTZ, UUID[]);
DROP FUNCTION IF EXISTS public.admin_update_promotion(UUID, TEXT, TEXT, INT, TIMESTAMPTZ, TIMESTAMPTZ, UUID[]);

CREATE OR REPLACE FUNCTION public.admin_create_promotion(
  p_title TEXT,
  p_description TEXT,
  p_duration_seconds INT,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_products JSONB,
  p_promo_type TEXT DEFAULT 'cart_dash',
  p_banner_image_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promotion_id UUID;
  v_item JSONB;
BEGIN
  IF NOT (public.has_admin_permission(auth.uid(), 'promotions') OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'You do not have permission to manage promotions.';
  END IF;

  INSERT INTO public.promotions (title, description, duration_seconds, starts_at, ends_at, created_by, status, promo_type, banner_image_url)
  VALUES (p_title, p_description, COALESCE(p_duration_seconds, 3), p_starts_at, p_ends_at, auth.uid(), 'draft', COALESCE(p_promo_type, 'cart_dash'), p_banner_image_url)
  RETURNING id INTO v_promotion_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_products, '[]'::jsonb)) LOOP
    IF v_item->>'product_id' IS NOT NULL THEN
      INSERT INTO public.promo_products (promotion_id, product_id)
      VALUES (v_promotion_id, (v_item->>'product_id')::uuid)
      ON CONFLICT (promotion_id, product_id) DO NOTHING;
    ELSE
      INSERT INTO public.promo_products (promotion_id, custom_title, custom_price, custom_image_url)
      VALUES (
        v_promotion_id,
        v_item->>'custom_title',
        NULLIF(v_item->>'custom_price', '')::numeric,
        v_item->>'custom_image_url'
      );
    END IF;
  END LOOP;

  RETURN v_promotion_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_promotion(TEXT, TEXT, INT, TIMESTAMPTZ, TIMESTAMPTZ, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_promotion(TEXT, TEXT, INT, TIMESTAMPTZ, TIMESTAMPTZ, JSONB, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_promotion(
  p_promotion_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_duration_seconds INT,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_products JSONB,
  p_promo_type TEXT DEFAULT NULL,
  p_banner_image_url TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_keep_ids UUID[];
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
      promo_type = COALESCE(p_promo_type, promo_type),
      banner_image_url = COALESCE(p_banner_image_url, banner_image_url),
      updated_at = now()
  WHERE id = p_promotion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promotion not found.';
  END IF;

  -- Update existing rows in place (preserves claimed_count) for anything the
  -- admin kept, insert anything new, and only delete rows that were
  -- genuinely dropped from the list - a blanket delete+reinsert would zero
  -- out real grab progress on items an admin only wanted to, say, retitle.
  v_keep_ids := ARRAY(
    SELECT (v->>'id')::uuid
    FROM jsonb_array_elements(COALESCE(p_products, '[]'::jsonb)) v
    WHERE v->>'id' IS NOT NULL
  );

  DELETE FROM public.promo_products
  WHERE promotion_id = p_promotion_id
    AND (v_keep_ids IS NULL OR NOT (id = ANY(v_keep_ids)));

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_products, '[]'::jsonb)) LOOP
    IF v_item->>'id' IS NOT NULL THEN
      UPDATE public.promo_products
      SET product_id = NULLIF(v_item->>'product_id', '')::uuid,
          custom_title = v_item->>'custom_title',
          custom_price = NULLIF(v_item->>'custom_price', '')::numeric,
          custom_image_url = v_item->>'custom_image_url'
      WHERE id = (v_item->>'id')::uuid AND promotion_id = p_promotion_id;
    ELSIF v_item->>'product_id' IS NOT NULL THEN
      INSERT INTO public.promo_products (promotion_id, product_id)
      VALUES (p_promotion_id, (v_item->>'product_id')::uuid)
      ON CONFLICT (promotion_id, product_id) DO NOTHING;
    ELSE
      INSERT INTO public.promo_products (promotion_id, custom_title, custom_price, custom_image_url)
      VALUES (
        p_promotion_id,
        v_item->>'custom_title',
        NULLIF(v_item->>'custom_price', '')::numeric,
        v_item->>'custom_image_url'
      );
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_promotion(UUID, TEXT, TEXT, INT, TIMESTAMPTZ, TIMESTAMPTZ, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_promotion(UUID, TEXT, TEXT, INT, TIMESTAMPTZ, TIMESTAMPTZ, JSONB, TEXT, TEXT) TO authenticated;
