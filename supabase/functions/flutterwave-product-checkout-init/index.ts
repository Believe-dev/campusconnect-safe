import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CheckoutItem = { cartItemId?: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: authError } = await authClient.auth.getUser();
  if (authError || !userData.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let orderId: string | null = null;

  try {
    const { items, shippingAddress, universityName } = await req.json();
    if (!Array.isArray(items) || items.length === 0 || items.length > 25) {
      return Response.json({ error: "Your checkout items are invalid." }, { status: 400, headers: corsHeaders });
    }
    if (typeof shippingAddress !== "string" || !shippingAddress.trim() || shippingAddress.length > 1000 ||
        typeof universityName !== "string" || !universityName.trim() || universityName.length > 200) {
      return Response.json({ error: "A delivery address and university are required." }, { status: 400, headers: corsHeaders });
    }

    const cartItemIds = items.map((item: unknown) => (item as Partial<CheckoutItem>)?.cartItemId);
    if (cartItemIds.some((cartItemId) => typeof cartItemId !== "string" || !cartItemId) || new Set(cartItemIds).size !== cartItemIds.length) {
      return Response.json({ error: "Your checkout items are invalid." }, { status: 400, headers: corsHeaders });
    }

    const { data: cartRows, error: cartError } = await admin
      .from("cart")
      .select("id, product_id, quantity, selected_size")
      .eq("user_id", userData.user.id)
      .in("id", cartItemIds as string[]);
    if (cartError) throw cartError;
    if (!cartRows || cartRows.length !== cartItemIds.length) {
      return Response.json({ error: "Your cart changed. Please review it and try again." }, { status: 409, headers: corsHeaders });
    }
    const parsedItems = cartRows.map((item) => ({
      productId: item.product_id,
      quantity: Number(item.quantity),
      selectedSize: item.selected_size,
    }));
    if (parsedItems.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100)) {
      return Response.json({ error: "One or more item quantities are invalid." }, { status: 400, headers: corsHeaders });
    }

    const productIds = [...new Set(parsedItems.map((item) => item.productId))];
    const { data: products, error: productsError } = await admin
      .from("products")
      .select("id, seller_id, price, is_active")
      .in("id", productIds)
      .eq("is_active", true);
    if (productsError) throw productsError;
    if (!products || products.length !== productIds.length) {
      return Response.json({ error: "One or more products are no longer available." }, { status: 409, headers: corsHeaders });
    }

    const productsById = new Map(products.map((product) => [product.id, product]));
    const sellerId = products[0].seller_id;
    if (!sellerId || sellerId === userData.user.id || products.some((product) => product.seller_id !== sellerId)) {
      return Response.json({ error: "Checkout items must belong to one other seller." }, { status: 400, headers: corsHeaders });
    }

    const lineItems = parsedItems.map((item) => {
      const product = productsById.get(item.productId)!;
      return { ...item, unitPrice: Number(product.price) };
    });
    const totalAmount = lineItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new Error("Could not calculate the order total.");

    const { data: buyerProfile, error: buyerError } = await admin
      .from("profiles")
      .select("email, full_name, phone_number")
      .eq("user_id", userData.user.id)
      .single();
    if (buyerError || !buyerProfile?.email) throw new Error("Buyer profile not found.");

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        buyer_id: userData.user.id,
        seller_id: sellerId,
        product_id: lineItems[0].productId,
        quantity: lineItems.reduce((sum, item) => sum + item.quantity, 0),
        selected_size: lineItems[0].selectedSize,
        total_amount: totalAmount,
        commission_amount: 0,
        shipping_address: shippingAddress.trim(),
        university_name: universityName.trim(),
        payment_method: "flutterwave_escrow",
        status: "pending",
      })
      .select("id")
      .single();
    if (orderError || !order) throw orderError || new Error("Failed to create order.");
    orderId = order.id;

    const { error: lineItemError } = await admin.from("order_line_items").insert(
      lineItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        selected_size: item.selectedSize,
        unit_price: item.unitPrice,
      }))
    );
    if (lineItemError) throw lineItemError;

    const paymentReference = `order-${order.id}-${crypto.randomUUID()}`;
    const { error: attemptError } = await admin.from("flutterwave_order_payment_attempts").insert({
      order_id: order.id,
      buyer_id: userData.user.id,
      cart_item_ids: cartItemIds,
      payment_reference: paymentReference,
      amount: totalAmount,
      currency: "NGN",
    });
    if (attemptError) throw attemptError;

    const origin = req.headers.get("origin");
    const configuredAppUrl = Deno.env.get("APP_URL");
    const redirectBaseUrl = configuredAppUrl || origin;
    if (!redirectBaseUrl) throw new Error("APP_URL is not configured and no request origin was supplied.");
    const redirectUrl = new URL("/product-payment-callback", redirectBaseUrl).toString();

    const secretKey = Deno.env.get("FLW_SECRET_KEY");
    if (!secretKey) throw new Error("Flutterwave is not configured yet.");
    const paymentResponse = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        tx_ref: paymentReference,
        amount: totalAmount,
        currency: "NGN",
        redirect_url: redirectUrl,
        customer: { email: buyerProfile.email, name: buyerProfile.full_name || undefined, phonenumber: buyerProfile.phone_number || undefined },
        customizations: { title: "UniMarket order payment", description: `Escrow-protected order ${order.id}` },
        configuration: { session_duration: 30, max_retry_attempt: 5 },
        meta: { order_id: order.id, buyer_id: userData.user.id },
      }),
    });
    const paymentPayload = await paymentResponse.json().catch(() => null);
    if (!paymentResponse.ok || paymentPayload?.status !== "success" || !paymentPayload?.data?.link) {
      throw new Error(paymentPayload?.message || "Flutterwave could not create a checkout link.");
    }

    return Response.json({ orderId: order.id, paymentReference, amount: totalAmount, paymentLink: paymentPayload.data.link }, { headers: corsHeaders });
  } catch (error) {
    console.error("flutterwave product checkout init failed", error);
    if (orderId) await admin.from("orders").delete().eq("id", orderId);
    return Response.json({ error: error instanceof Error ? error.message : "Failed to start Flutterwave checkout." }, { status: 500, headers: corsHeaders });
  }
});
