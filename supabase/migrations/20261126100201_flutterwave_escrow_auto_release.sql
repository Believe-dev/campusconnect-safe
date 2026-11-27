-- Flutterwave escrow auto-release (Phase 4).
-- The earlier pg_cron job calls an auto-release function that was later made
-- service-role-only. This replacement owns its own narrow, non-public ledger
-- transition and only settles Flutterwave-collected, delivered, undisputed orders.

CREATE INDEX IF NOT EXISTS escrow_transactions_due_flutterwave_release_idx
  ON public.escrow_transactions (auto_release_at)
  WHERE status = 'held' AND auto_release_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_order_auto_confirm_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- A buyer gets the documented two-day protection window after delivery. A
  -- dispute later restored to delivered begins a fresh window instead of using
  -- an expired deadline from before the dispute.
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    NEW.auto_confirm_at := now() + interval '2 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_auto_confirm_at_on_delivery ON public.orders;
CREATE TRIGGER set_order_auto_confirm_at_on_delivery
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_auto_confirm_at();

CREATE OR REPLACE FUNCTION public.sync_escrow_auto_release_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    UPDATE public.escrow_transactions
    SET auto_release_at = NEW.auto_confirm_at,
        updated_at = now()
    WHERE order_id = NEW.id AND status = 'held';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_escrow_auto_release_at_on_delivery ON public.orders;
CREATE TRIGGER sync_escrow_auto_release_at_on_delivery
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_escrow_auto_release_at();

-- Manual release/refund uses the same row lock as the scheduled sweep. The
-- status test alone is not sufficient if two requests read a held row before
-- either one writes it.
CREATE OR REPLACE FUNCTION public.release_escrow_funds(escrow_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  escrow_record public.escrow_transactions%ROWTYPE;
  seller_wallet_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'release_escrow_funds can only be called via the anchor-escrow-resolve edge function.';
  END IF;

  SELECT * INTO escrow_record
  FROM public.escrow_transactions
  WHERE id = escrow_id AND status = 'held'
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.wallets (user_id)
  VALUES (escrow_record.seller_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO seller_wallet_id
  FROM public.wallets
  WHERE user_id = escrow_record.seller_id;

  UPDATE public.escrow_transactions
  SET status = 'released', released_at = now(), updated_at = now()
  WHERE id = escrow_id;

  UPDATE public.wallets
  SET available_balance = available_balance + escrow_record.seller_amount,
      total_earnings = total_earnings + escrow_record.seller_amount,
      total_commission_paid = total_commission_paid + escrow_record.commission_amount,
      updated_at = now()
  WHERE id = seller_wallet_id;

  IF escrow_record.seller_amount > 0 THEN
    INSERT INTO public.wallet_transactions (
      wallet_id, user_id, type, amount, description, reference_id, reference_type
    ) VALUES (
      seller_wallet_id, escrow_record.seller_id, 'credit', escrow_record.seller_amount,
      'Payment received for order', escrow_record.order_id, 'order'
    );
  END IF;

  IF escrow_record.commission_amount > 0 THEN
    INSERT INTO public.wallet_transactions (
      wallet_id, user_id, type, amount, description, reference_id, reference_type
    ) VALUES (
      seller_wallet_id, escrow_record.seller_id, 'commission', escrow_record.commission_amount,
      'Platform commission deducted', escrow_record.order_id, 'commission'
    );
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_escrow_funds(escrow_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  escrow_record public.escrow_transactions%ROWTYPE;
  buyer_wallet_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'reverse_escrow_funds can only be called via the anchor-escrow-resolve edge function.';
  END IF;

  SELECT * INTO escrow_record
  FROM public.escrow_transactions
  WHERE id = escrow_id AND status = 'held'
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.wallets (user_id)
  VALUES (escrow_record.buyer_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO buyer_wallet_id
  FROM public.wallets
  WHERE user_id = escrow_record.buyer_id;

  UPDATE public.escrow_transactions
  SET status = 'refunded', updated_at = now()
  WHERE id = escrow_id;

  UPDATE public.wallets
  SET available_balance = available_balance + escrow_record.amount,
      updated_at = now()
  WHERE id = buyer_wallet_id;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, description, reference_id, reference_type
  ) VALUES (
    buyer_wallet_id, escrow_record.buyer_id, 'refund', escrow_record.amount,
    'Order payment reversed to buyer (dispute resolved in buyer favor)',
    escrow_record.order_id, 'order'
  );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_release_due_flutterwave_escrow()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow record;
  v_released_id uuid;
  v_wallet_id uuid;
  v_released_count integer := 0;
BEGIN
  FOR v_escrow IN
    SELECT e.id, e.order_id, e.seller_id, e.seller_amount, e.commission_amount
    FROM public.escrow_transactions AS e
    INNER JOIN public.orders AS o ON o.id = e.order_id
    WHERE e.status = 'held'
      AND e.auto_release_at IS NOT NULL
      AND e.auto_release_at <= now()
      AND o.status = 'delivered'
      AND o.payment_method = 'flutterwave_escrow'
      AND NOT EXISTS (
        SELECT 1
        FROM public.disputes AS d
        WHERE d.order_id = e.order_id
          AND d.status IN ('open', 'investigating')
      )
    FOR UPDATE OF e SKIP LOCKED
  LOOP
    -- This conditional update is the idempotency boundary. If a manual release
    -- wins the race, nothing is credited a second time.
    v_released_id := NULL;
    UPDATE public.escrow_transactions
    SET status = 'released',
        released_at = now(),
        settlement_provider = 'flutterwave',
        settlement_status = 'not_required',
        updated_at = now()
    WHERE id = v_escrow.id AND status = 'held'
    RETURNING id INTO v_released_id;
    IF v_released_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.wallets (user_id)
    VALUES (v_escrow.seller_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT id INTO v_wallet_id
    FROM public.wallets
    WHERE user_id = v_escrow.seller_id;

    UPDATE public.wallets
    SET available_balance = available_balance + v_escrow.seller_amount,
        total_earnings = total_earnings + v_escrow.seller_amount,
        total_commission_paid = total_commission_paid + v_escrow.commission_amount,
        updated_at = now()
    WHERE id = v_wallet_id;

    INSERT INTO public.wallet_transactions (
      wallet_id, user_id, type, amount, description, reference_id, reference_type, status
    ) VALUES (
      v_wallet_id, v_escrow.seller_id, 'credit', v_escrow.seller_amount,
      'Escrow automatically released after delivery protection window',
      v_escrow.order_id, 'order', 'completed'
    );

    UPDATE public.orders
    SET status = 'confirmed', escrow_released = true, updated_at = now()
    WHERE id = v_escrow.order_id AND status = 'delivered';

    v_released_count := v_released_count + 1;
  END LOOP;

  RETURN v_released_count;
END;
$$;

REVOKE ALL ON FUNCTION public.set_order_auto_confirm_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_escrow_auto_release_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_escrow_funds(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reverse_escrow_funds(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_release_due_flutterwave_escrow() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_escrow_funds(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_escrow_funds(uuid) TO service_role;

-- Retire the legacy job, which cannot call the post-hardening function and
-- would try to settle legacy Anchor orders without their required book transfer.
DO $migration$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  PERFORM cron.unschedule('auto-release-escrow')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-release-escrow');

  PERFORM cron.unschedule('auto-release-flutterwave-escrow')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-release-flutterwave-escrow');

  PERFORM cron.schedule(
    'auto-release-flutterwave-escrow',
    '*/15 * * * *',
    $cron$SELECT public.auto_release_due_flutterwave_escrow();$cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Flutterwave escrow auto-release scheduling skipped: %', SQLERRM;
END;
$migration$;
