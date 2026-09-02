import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UnconfirmedOrder {
  id: string;
  product_title: string;
}

const DISMISS_KEY = "confirm-receipt-dismissed";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Same "check on app open, dismiss with a localStorage cooldown" shape as
// useProfileCompletion — the established pattern for a global, app-entry
// reminder, applied here to delivered-but-unconfirmed orders (confirming
// receipt is what releases escrow funds to the seller, so a buyer sitting
// on a delivered order is blocking real money).
export const useConfirmReceiptReminder = () => {
  const [orders, setOrders] = useState<UnconfirmedOrder[]>([]);
  const [showReminder, setShowReminder] = useState(false);

  const checkUnconfirmedOrders = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("orders")
        .select("id, products (title)")
        .eq("buyer_id", user.id)
        .eq("status", "delivered")
        .order("created_at", { ascending: false });

      const unconfirmed: UnconfirmedOrder[] = (data || []).map((order: any) => ({
        id: order.id,
        product_title: order.products?.title || "your order",
      }));

      setOrders(unconfirmed);

      if (unconfirmed.length > 0) {
        const lastDismissed = localStorage.getItem(DISMISS_KEY);
        const cooledDown = !lastDismissed || Date.now() > parseInt(lastDismissed, 10);
        if (cooledDown) setShowReminder(true);
      }
    } catch (error) {
      // Error handled silently — this is a nudge, not a critical path.
    }
  }, []);

  useEffect(() => {
    checkUnconfirmedOrders();
  }, [checkUnconfirmedOrders]);

  const dismiss = () => {
    setShowReminder(false);
    localStorage.setItem(DISMISS_KEY, (Date.now() + COOLDOWN_MS).toString());
  };

  return { showReminder, orders, dismiss };
};
