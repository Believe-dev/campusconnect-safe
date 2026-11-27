type FlutterwaveTransaction = {
  id?: number | string;
  tx_ref?: string;
  status?: string;
  amount?: number | string;
  currency?: string;
};

type OrderPaymentAttempt = {
  id: string;
  order_id: string;
  buyer_id: string;
  cart_item_ids: string[];
  payment_reference: string;
  amount: number | string;
  currency: string;
  status: "pending" | "paid" | "failed" | "expired";
  flutterwave_transaction_id: string | null;
};

export const verifyFlutterwaveTransaction = async (transactionId: string): Promise<FlutterwaveTransaction> => {
  const secretKey = Deno.env.get("FLW_SECRET_KEY");
  if (!secretKey) throw new Error("FLW_SECRET_KEY is not configured.");

  const response = await fetch(
    `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
    { headers: { Authorization: `Bearer ${secretKey}`, Accept: "application/json" } }
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status !== "success" || !payload?.data) {
    throw new Error(payload?.message || "Flutterwave could not verify this transaction.");
  }
  return payload.data as FlutterwaveTransaction;
};

export const verifyFlutterwaveOrderPayment = async (
  admin: any,
  attempt: OrderPaymentAttempt,
  transactionId: string
): Promise<{ verified: boolean; message: string; orderId: string; alreadyProcessed: boolean }> => {
  if (attempt.status === "paid") {
    return {
      verified: true,
      message: "Flutterwave payment already verified.",
      orderId: attempt.order_id,
      alreadyProcessed: true,
    };
  }
  if (attempt.status !== "pending") {
    return {
      verified: false,
      message: "This payment attempt can no longer be used.",
      orderId: attempt.order_id,
      alreadyProcessed: false,
    };
  }

  const transaction = await verifyFlutterwaveTransaction(transactionId);
  const matches =
    transaction.status === "successful" &&
    transaction.tx_ref === attempt.payment_reference &&
    transaction.currency === attempt.currency &&
    Number(transaction.amount) >= Number(attempt.amount);

  if (!matches) {
    return {
      verified: false,
      message: "Flutterwave could not confirm the expected payment.",
      orderId: attempt.order_id,
      alreadyProcessed: false,
    };
  }

  const transactionValue = String(transaction.id ?? transactionId);
  const { data: updatedOrder, error: orderError } = await admin
    .from("orders")
    .update({ status: "paid", payment_reference: attempt.payment_reference, updated_at: new Date().toISOString() })
    .eq("id", attempt.order_id)
    .eq("status", "pending")
    .select("id");
  if (orderError) throw orderError;

  if (!updatedOrder?.length) {
    const { data: existingOrder, error: existingOrderError } = await admin
      .from("orders")
      .select("status, payment_reference")
      .eq("id", attempt.order_id)
      .single();
    if (existingOrderError) throw existingOrderError;
    if (existingOrder?.status !== "paid" || existingOrder.payment_reference !== attempt.payment_reference) {
      return {
        verified: false,
        message: "This order can no longer accept this payment.",
        orderId: attempt.order_id,
        alreadyProcessed: false,
      };
    }
  }

  // Remove only the cart rows that were snapshotted for this paid attempt. This
  // occurs server-side so a completed order cannot reappear in the cart if the
  // customer closes the Flutterwave return page before it loads.
  const { error: cartError } = await admin
    .from("cart")
    .delete()
    .eq("user_id", attempt.buyer_id)
    .in("id", attempt.cart_item_ids);
  if (cartError) throw cartError;

  const { error: attemptError } = await admin
    .from("flutterwave_order_payment_attempts")
    .update({
      status: "paid",
      flutterwave_transaction_id: transactionValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", attempt.id);
  if (attemptError) throw attemptError;

  return {
    verified: true,
    message: "Flutterwave payment verified. Your order is now protected by escrow.",
    orderId: attempt.order_id,
    alreadyProcessed: !updatedOrder?.length,
  };
};

export const processFlutterwaveOrderWebhook = async (admin: any, payload: any): Promise<boolean> => {
  const eventType = typeof payload?.event === "string" ? payload.event : "unknown";
  const transactionId = payload?.data?.id;
  const txRef = payload?.data?.tx_ref;
  const transactionStatus = typeof payload?.data?.status === "string" ? payload.data.status : "unknown";
  if ((typeof transactionId !== "number" && typeof transactionId !== "string") || typeof txRef !== "string" || !txRef.startsWith("order-")) {
    return false;
  }

  const eventKey = `${eventType}:${transactionId}:${transactionStatus}`;
  const { data: existingEvent, error: existingEventError } = await admin
    .from("flutterwave_webhook_events")
    .select("id, processed_at")
    .eq("event_key", eventKey)
    .maybeSingle();
  if (existingEventError) throw existingEventError;
  if (existingEvent?.processed_at) return true;

  const { data: event, error: eventError } = await admin
    .from("flutterwave_webhook_events")
    .upsert({ event_key: eventKey, event_type: eventType, payload, error: null }, { onConflict: "event_key" })
    .select("id")
    .single();
  if (eventError || !event) throw eventError || new Error("Failed to record webhook event.");

  if (eventType === "charge.completed" && transactionStatus === "successful") {
    const { data: attempt, error: attemptError } = await admin.from("flutterwave_order_payment_attempts")
      .select("id, order_id, buyer_id, cart_item_ids, payment_reference, amount, currency, status, flutterwave_transaction_id")
      .eq("payment_reference", txRef)
      .maybeSingle();
    if (attemptError) throw attemptError;
    if (attempt) await verifyFlutterwaveOrderPayment(admin, attempt, String(transactionId));
  }

  const { error: processedError } = await admin
    .from("flutterwave_webhook_events")
    .update({ processed_at: new Date().toISOString(), error: null })
    .eq("id", event.id);
  if (processedError) throw processedError;
  return true;
};
