// Initiates an order and its own Anchor Sub-Ledger account (a child of the platform's
// deposit account, unique to this order) - replacing the old flow where every buyer's
// payment landed in their own general-purpose wallet account with no per-order
// isolation. The buyer transfers to the NUBAN this returns; payment is only confirmed
// once Anchor's nip.inbound.completed webhook fires (see anchor-webhook) or the buyer
// triggers anchor-checkout-verify - never by the client declaring success on its own.
//
// Requires the ANCHOR_DEPOSIT_ACCOUNT_ID secret: the platform's own Anchor deposit
// account that Sub-Ledger accounts are created under (docs.getanchor.co/reference/
// sub-account). Set this in Supabase Edge Function secrets before this can create
// real sub-accounts.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { anchorApiFetch } from "../_shared/anchor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: authError } = await authClient.auth.getUser();
  if (authError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const buyerId = userData.user.id;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  let orderId: string | null = null;

  try {
    const {
      sellerId,
      productId,
      quantity,
      selectedSize,
      totalAmount,
      shippingAddress,
      universityName,
      paymentMethod,
    } = await req.json();

    if (!sellerId || !productId || !totalAmount || totalAmount <= 0) {
      return new Response(JSON.stringify({ error: "Missing or invalid order details." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const depositAccountId = Deno.env.get("ANCHOR_DEPOSIT_ACCOUNT_ID");
    if (!depositAccountId) {
      throw new Error("ANCHOR_DEPOSIT_ACCOUNT_ID is not configured - cannot create a Sub-Ledger account for this order.");
    }

    const { data: buyerProfile } = await admin
      .from("profiles")
      .select("full_name, email, phone_number, anchor_customer_id")
      .eq("user_id", buyerId)
      .single();

    if (!buyerProfile) throw new Error("Buyer profile not found.");

    // Ensure the buyer has an Anchor customer record (independent of seller KYC).
    let anchorCustomerId = buyerProfile.anchor_customer_id;
    if (!anchorCustomerId) {
      const custRes = await anchorApiFetch("/customers", "POST", {
        data: {
          type: "customer",
          attributes: {
            type: "INDIVIDUAL",
            email: buyerProfile.email,
            fullName: buyerProfile.full_name,
            phoneNumber: buyerProfile.phone_number || "08012345678",
          },
        },
      });
      if (!custRes.ok || !custRes.data?.data?.id) {
        throw new Error(custRes.error || "Failed to create Anchor customer for buyer.");
      }
      anchorCustomerId = custRes.data.data.id;
      await admin.from("profiles").update({ anchor_customer_id: anchorCustomerId }).eq("user_id", buyerId);
    }

    // Create the order first (status 'pending' - not 'paid'). Only the webhook (or
    // anchor-checkout-verify) flips it to 'paid', which is what triggers escrow creation.
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        buyer_id: buyerId,
        seller_id: sellerId,
        product_id: productId,
        quantity,
        selected_size: selectedSize || null,
        total_amount: totalAmount,
        commission_amount: 0,
        shipping_address: shippingAddress,
        university_name: universityName,
        payment_method: paymentMethod || "anchor_escrow",
        status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) throw orderError || new Error("Failed to create order.");
    orderId = order.id;

    // Create the order's own Sub-Ledger account under the platform deposit account.
    const subAccountRes = await anchorApiFetch("/sub-accounts", "POST", {
      data: {
        type: "SubAccount",
        attributes: {
          productName: `Order ${order.id}`,
        },
        relationships: {
          customer: { data: { type: "Customer", id: anchorCustomerId } },
          account: { data: { type: "DepositAccount", id: depositAccountId } },
        },
      },
    });

    if (!subAccountRes.ok || !subAccountRes.data?.data?.id) {
      throw new Error(subAccountRes.error || "Failed to create Anchor Sub-Ledger account for this order.");
    }

    const subAccount = subAccountRes.data.data;
    const accountNumber = subAccount.attributes?.accountNumber || subAccount.attributes?.virtualNuban?.accountNumber;
    const bankName = subAccount.attributes?.bank?.name || "CoreStep Microfinance / Anchor";

    await admin
      .from("orders")
      .update({
        anchor_sub_account_id: subAccount.id,
        anchor_sub_account_number: accountNumber,
        anchor_bank_name: bankName,
      })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        nubanAccount: accountNumber,
        bankName,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("🔴 anchor-checkout error:", err);
    if (orderId) {
      // Roll back the order - it never got a payable Sub-Ledger account.
      await admin.from("orders").delete().eq("id", orderId);
    }
    return new Response(JSON.stringify({ error: err?.message || "Checkout initiation failed." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
