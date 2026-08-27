// Releases or reverses a held escrow. This is the ONLY place either action can happen -
// it replaces both the old client-side approveSellerEscrow/refundAnchorPayment Anchor
// calls (which shipped the Anchor key to the browser) AND closes a real authorization
// hole: previously a seller could open their own "Sales" order view and click
// "Approve Order & Release Anchor Funds" to pay themselves, with no buyer confirmation
// involved at all. Authorization here is enforced server-side:
//   - release: the order's buyer (confirming receipt), or an admin (dispute resolution)
//   - reverse: admin only (dispute resolution)
//
// Money-safety ordering: the DB-side atomic claim+credit (release_escrow_funds /
// reverse_escrow_funds, both WHERE status = 'held') happens BEFORE the Anchor transfer
// call. If the Anchor call then fails, the ledger is already correct and consistent -
// it just needs the transfer retried/reconciled (anchor_transfer_status = 'failed')
// rather than risking a double real-money transfer from retrying the whole flow.

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
  const requesterId = userData.user.id;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { orderId, action } = await req.json();
    if (!orderId || (action !== "release" && action !== "reverse")) {
      return new Response(JSON.stringify({ error: "orderId and a valid action ('release' | 'reverse') are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, buyer_id, seller_id, total_amount")
      .eq("id", orderId)
      .single();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdminRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", requesterId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!isAdminRow;
    const isBuyer = requesterId === order.buyer_id;

    if (action === "release" && !isBuyer && !isAdmin) {
      return new Response(JSON.stringify({ error: "Only the buyer or an admin can release this order's funds." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action === "reverse" && !isAdmin) {
      return new Response(JSON.stringify({ error: "Only an admin can reverse this order's payment." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: escrow, error: escrowErr } = await admin
      .from("escrow_transactions")
      .select("id, status, seller_amount, anchor_sub_account_id")
      .eq("order_id", orderId)
      .maybeSingle();
    if (escrowErr || !escrow) {
      return new Response(JSON.stringify({ error: "No escrow transaction found for this order." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (escrow.status !== "held") {
      return new Response(
        JSON.stringify({ success: true, message: `This order's payment has already been resolved (${escrow.status}).` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Atomic DB claim + ledger credit FIRST.
    const rpcName = action === "release" ? "release_escrow_funds" : "reverse_escrow_funds";
    const { data: claimed, error: rpcErr } = await admin.rpc(rpcName, { escrow_id: escrow.id });
    if (rpcErr) {
      throw new Error(rpcErr.message);
    }
    if (claimed === false) {
      return new Response(
        JSON.stringify({ success: true, message: "This order's payment has already been resolved." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // "confirmed" (not "completed") on release - that's the status value the
    // rest of the app actually reads: the canonical Order type, the
    // buyer's own confirm-delivery action, ProductReviews' review-eligibility
    // check, and Admin.tsx's own revenue query all use "confirmed".
    // escrow_released also flips true here - it previously defaulted to
    // false and nothing ever set it, so the "Payment Released" badge in
    // Orders.tsx/OrderDetailsDialog.tsx could never show.
    await admin
      .from("orders")
      .update({
        status: action === "release" ? "confirmed" : "refunded",
        ...(action === "release" ? { escrow_released: true } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // 2. Anchor book-transfer: the order's Sub-Ledger account settles back to the
    // platform deposit account. The DB ledger above already reflects who is owed the
    // funds (seller on release, buyer on reversal); actual payout to their real bank
    // account happens through the existing withdrawal flow.
    const depositAccountId = Deno.env.get("ANCHOR_DEPOSIT_ACCOUNT_ID");
    const reference = `ANCHOR_${action.toUpperCase()}_${orderId}`;

    if (depositAccountId && escrow.anchor_sub_account_id) {
      const transferRes = await anchorApiFetch("/transfers", "POST", {
        data: {
          type: "Transfer",
          attributes: {
            amount: Math.round(Number(escrow.seller_amount) * 100),
            currency: "NGN",
            reference,
            narration: `Escrow ${action} for order ${orderId}`,
          },
          relationships: {
            source: { data: { type: "SubAccount", id: escrow.anchor_sub_account_id } },
            destination: { data: { type: "DepositAccount", id: depositAccountId } },
          },
        },
      });

      const referenceColumn = action === "release" ? "release_reference" : "reversal_reference";
      await admin
        .from("escrow_transactions")
        .update({
          [referenceColumn]: reference,
          anchor_transfer_status: transferRes.ok ? "sent" : "failed",
        })
        .eq("id", escrow.id);

      if (!transferRes.ok) {
        console.error(`🔴 Anchor book-transfer failed for order ${orderId} (${action}) - ledger already updated, needs reconciliation:`, transferRes.error);
      }
    } else {
      console.warn(`ℹ️ Skipping Anchor transfer for order ${orderId}: ANCHOR_DEPOSIT_ACCOUNT_ID or sub-account not configured.`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message:
          action === "release"
            ? `₦${Number(escrow.seller_amount).toLocaleString()} released to the seller.`
            : `₦${Number(escrow.seller_amount).toLocaleString()} reversed to the buyer.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("🔴 anchor-escrow-resolve error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Failed to resolve escrow." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
