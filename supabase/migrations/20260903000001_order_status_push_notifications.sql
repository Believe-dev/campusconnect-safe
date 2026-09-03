-- Order status changes (shipped, delivered, confirmed, cancelled, refunded,
-- disputed) now notify the buyer - email + push, through the same
-- notifications-table pipeline (send_notification_alerts(), see
-- 20260717000001_web_push_and_message_push.sql) everything else already
-- goes through, rather than a separate one-off mechanism.
--
-- This was previously only handled ad-hoc, client-side, for shipped/
-- delivered only (Orders.tsx's updateOrderStatus - now removed, see that
-- file), and even then with a bug: it hardcoded type: 'info', which fell
-- through send_notification_alerts()'s CASE statement into the generic
-- ELSE branch instead of the 'order'/'order_shipped'/'order_delivered'
-- branch that actually checks the user's order_updates preference - so it
-- ignored that preference entirely. confirmed/cancelled/refunded/disputed
-- had no notification path at all.
--
-- A DB trigger directly on orders.status is the fix for both problems at
-- once: it fires no matter which code path updates the order (this file's
-- own handler, admin dispute resolution, the escrow-resolve edge
-- function), not just the one call site that used to handle it, so
-- there's one single, complete, correctly-gated source of truth instead of
-- scattered partial coverage.

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_title TEXT;
  status_title TEXT;
  status_type TEXT;
  status_message TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT title INTO product_title FROM public.products WHERE id = NEW.product_id;

  status_title := CASE NEW.status
    WHEN 'shipped' THEN 'Your order has shipped 📦'
    WHEN 'delivered' THEN 'Your order was delivered 🎉'
    WHEN 'confirmed' THEN 'Payment released to the seller'
    WHEN 'cancelled' THEN 'Your order was cancelled'
    WHEN 'refunded' THEN 'Your order was refunded'
    WHEN 'disputed' THEN 'Your order is under dispute review'
    ELSE NULL
  END;

  -- Statuses not in the CASE above (e.g. 'pending', 'paid') aren't
  -- buyer-actionable moments worth a push - stay silent for those.
  IF status_title IS NULL THEN
    RETURN NEW;
  END IF;

  status_type := CASE NEW.status
    WHEN 'shipped' THEN 'order_shipped'
    WHEN 'delivered' THEN 'order_delivered'
    ELSE 'order'
  END;

  status_message := COALESCE(product_title, 'Your order') || ' is now ' || NEW.status || '.'
    || CASE WHEN NEW.tracking_info IS NOT NULL AND NEW.tracking_info != ''
         THEN ' Tracking: ' || NEW.tracking_info
         ELSE ''
       END;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (NEW.buyer_id, status_title, status_message, status_type);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_order_status_notification ON public.orders;
CREATE TRIGGER trigger_order_status_notification
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.notify_order_status_change();

COMMENT ON FUNCTION public.notify_order_status_change IS
  'Inserts into notifications on any orders.status change with a buyer-actionable status - send_notification_alerts() picks it up from there for email+push, gated on the recipient''s order_updates preference.';
