// Server-side "check now" for a user who has just transferred funds to their
// seller payment intent's Sub-Ledger account. Mirrors anchor-checkout-verify -
// the actual Anchor lookup and the decision both happen here, server-side.
// No fail-open: if Anchor can't be reached or no matching transfer is found,
// this returns verified: false.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { anchorApiFetch } from "../_shared/anchor.ts";
import { completeSellerRegistration, completeSellerRenewal } from "../_shared/sellerPayment.ts";

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
  const userId = userData.user.id;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { intentId } = await req.json();
    if (!intentId) {
      return new Response(JSON.stringify({ error: "intentId is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: intent, error: intentErr } = await admin
      .from("seller_payment_intents")
      .select("id, user_id, purpose, amount, status, anchor_sub_account_id")
      .eq("id", intentId)
      .single();

    if (intentErr || !intent) {
      return new Response(JSON.stringify({ verified: false, message: "Payment intent not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (intent.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (intent.status !== "pending") {
      return new Response(
        JSON.stringify({ verified: intent.status === "paid", message: "Payment status: " + intent.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!intent.anchor_sub_account_id) {
      return new Response(JSON.stringify({ verified: false, message: "This payment has no payable account yet." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trfRes = await anchorApiFetch(`/transfers?filter[accountId]=${intent.anchor_sub_account_id}`, "GET");

    if (!trfRes.ok || !trfRes.data?.data) {
      console.error("🔴 Anchor transfer lookup failed during seller payment verify:", trfRes.error || trfRes.status);
      return new Response(
        JSON.stringify({ verified: false, message: "Unable to verify your deposit with Anchor right now. Please try again shortly." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expectedKobo = Math.round(Number(intent.amount) * 100);
    const match = trfRes.data.data.find((tx: any) => {
      const attrs = tx.attributes || {};
      const destAccount = attrs.destinationAccountId || attrs.accountId || attrs?.destination?.accountNumber;
      const amt = attrs.amount;
      const statusOk = !attrs.status || /completed|successful/i.test(attrs.status);
      return destAccount === intent.anchor_sub_account_id && (amt === expectedKobo || amt === Number(intent.amount)) && statusOk;
    });

    if (!match) {
      return new Response(
        JSON.stringify({ verified: false, message: "No matching deposit found yet. If you've just transferred, this can take a minute." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: updated } = await admin
      .from("seller_payment_intents")
      .update({ status: "paid", payment_reference: match.id, updated_at: new Date().toISOString() })
      .eq("id", intentId)
      .eq("status", "pending") // idempotent: no-op if the webhook already flipped it
      .select("id");

    if (updated?.length) {
      if (intent.purpose === "registration") {
        await completeSellerRegistration(admin, intent.user_id, match.id, Number(intent.amount));
      } else {
        await completeSellerRenewal(admin, intent.user_id, match.id);
      }
    }

    return new Response(
      JSON.stringify({ verified: true, message: "Bank transfer verified with Anchor." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("🔴 anchor-seller-payment-verify error:", err);
    return new Response(JSON.stringify({ verified: false, message: "Verification failed unexpectedly." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
