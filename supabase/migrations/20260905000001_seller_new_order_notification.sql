-- Seller-facing "New Order Received" notification, moved to fire from the
-- webhook-confirmed orders.status pending -> paid transition instead of the
-- buyer's client-side "I've paid" click (Checkout.tsx's
-- sendOrderPlacedNotifications, now stripped of its seller-facing half - see
-- that file). The old client-side path could notify a seller for a transfer
-- that never actually completed, and gave nothing if the buyer's tab closed
-- right after clicking confirm. pending -> paid is the same
-- webhook-confirmed, server-authoritative moment Bug 2's fix already made
-- the source of truth for payment completion.
--
-- Uses type = 'seller' (already a legal value per notifications_type_check,
-- 20250130000007_fix_notifications_system.sql) rather than the 'info' the
-- old client-side path hardcoded - send_notification_alerts() gates 'seller'
-- on the recipient's seller_notifications preference ("Notifications about
-- your seller account and sales" per NotificationSettings.tsx), which is
-- the semantically correct one for "you made a sale," and it's the same
-- type the Notifications.tsx "Seller" tab already groups (Notifications.tsx
-- TABS), so this shows up in the right tab instead of "Account".
--
-- Follows the exact pattern already established by
-- notify_order_status_change() (20260903000001_order_status_push_notifications.sql)
-- for buyer-facing order-status notifications: insert into notifications
-- and let send_notification_alerts() handle email/push from there, rather
-- than a separate one-off client-side email call - this also removes the
-- duplicate-email problem (the old path sent both this dedicated email AND
-- the generic pipeline's auto-email for the same order).

CREATE OR REPLACE FUNCTION public.notify_seller_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_title TEXT;
  buyer_name TEXT;
BEGIN
  SELECT title INTO product_title FROM public.products WHERE id = NEW.product_id;
  SELECT full_name INTO buyer_name FROM public.profiles WHERE user_id = NEW.buyer_id;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.seller_id,
    'New Order Received! 🎉',
    'You have a new order for ' || COALESCE(product_title, 'a product')
      || ' from ' || COALESCE(buyer_name, 'a buyer')
      || '. Quantity: ' || NEW.quantity
      || '. Total: ₦' || to_char(NEW.total_amount, 'FM999,999,999.00') || '.',
    'seller'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_seller_new_order ON public.orders;
CREATE TRIGGER trigger_notify_seller_new_order
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    WHEN (OLD.status = 'pending' AND NEW.status = 'paid')
    EXECUTE FUNCTION public.notify_seller_new_order();

COMMENT ON FUNCTION public.notify_seller_new_order IS
  'Inserts into notifications the moment an order is webhook-confirmed paid - send_notification_alerts() picks it up from there for email+push, gated on the seller''s seller_notifications preference.';
