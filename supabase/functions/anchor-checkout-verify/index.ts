// Server-side "check now" for a buyer who has just transferred funds to their order's
// Sub-Ledger account. This exists as a responsive fallback alongside the
// nip.inbound.completed webhook (sandbox webhook delivery can lag or, in local testing,
// not be reachable at all) - but unlike the old client-side verifyAnchorBankTransfer,
// the actual Anchor lookup and the decision both happen here, server-side, against the
// order's specific Sub-Ledger account. There is no fail-open: if Anchor can't be
// reached or no matching transfer is found, this returns verified: false.

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

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, buyer_id, status, total_amount, anchor_sub_account_id")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ verified: false, message: "Order not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.buyer_id !== buyerId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status !== "pending") {
      // Already confirmed (by webhook or a prior check) - idempotent success.
      return new Response(JSON.stringify({ verified: order.status !== "cancelled", message: "Order status: " + order.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order.anchor_sub_account_id) {
      return new Response(JSON.stringify({ verified: false, message: "This order has no payable account yet." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // NOTE: exact query/filter shape for a Sub-Account's transfer history isn't fully
    // documented publicly - confirm this endpoint against a real sandbox response
    // before relying on it. Falls back to filtering the general transfers list by
    // destination account id, matching the pattern the rest of this integration uses.
    const trfRes = await anchorApiFetch(`/transfers?filter[accountId]=${order.anchor_sub_account_id}`, "GET");

    if (!trfRes.ok || !trfRes.data?.data) {
      console.error("🔴 Anchor transfer lookup failed during manual verify:", trfRes.error || trfRes.status);
      return new Response(
        JSON.stringify({ verified: false, message: "Unable to verify your deposit with Anchor right now. Please try again shortly." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expectedKobo = Math.round(Number(order.total_amount) * 100);
    const match = trfRes.data.data.find((tx: any) => {
      const attrs = tx.attributes || {};
      const destAccount = attrs.destinationAccountId || attrs.accountId || attrs?.destination?.accountNumber;
      const amt = attrs.amount;
      const statusOk = !attrs.status || /completed|successful/i.test(attrs.status);
      return destAccount === order.anchor_sub_account_id && (amt === expectedKobo || amt === Number(order.total_amount)) && statusOk;
    });

    if (!match) {
      return new Response(
        JSON.stringify({ verified: false, message: "No matching deposit found yet. If you've just transferred, this can take a minute." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: updated } = await admin
      .from("orders")
      .update({ status: "paid", payment_reference: match.id, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("status", "pending") // idempotent: no-op if the webhook already flipped it
      .select("id");

    return new Response(
      JSON.stringify({ verified: true, message: "Bank transfer verified with Anchor.", alreadyProcessed: !updated?.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("🔴 anchor-checkout-verify error:", err);
    return new Response(JSON.stringify({ verified: false, message: "Verification failed unexpectedly." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
