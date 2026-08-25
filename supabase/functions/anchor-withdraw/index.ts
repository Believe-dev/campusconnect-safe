// Withdraws funds from the caller's own wallet to an external Nigerian bank account.
// The Anchor outward transfer call happens here, server-side, instead of in the
// browser with an exposed API key.

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
  const userId = userData.user.id;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { bankName, accountNumber, accountName, amount, narration } = await req.json();

    if (!bankName || !accountNumber || !accountName || !amount || amount < 100) {
      return new Response(JSON.stringify({ error: "Minimum bank withdrawal amount is ₦100 and all bank details are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atomic claim: only debit if the balance actually covers it, in one statement, so
    // two concurrent withdrawal requests can't both pass a balance check and overdraw.
    const { data: wallet } = await admin.from("wallets").select("id, available_balance").eq("user_id", userId).maybeSingle();
    if (!wallet) throw new Error("Wallet not found.");
    if (Number(wallet.available_balance) < amount) {
      return new Response(
        JSON.stringify({
          error: `Insufficient available balance. Available: ₦${Number(wallet.available_balance).toLocaleString()}, requested: ₦${amount.toLocaleString()}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: claimed } = await admin
      .from("wallets")
      .update({ available_balance: Number(wallet.available_balance) - amount })
      .eq("user_id", userId)
      .eq("available_balance", wallet.available_balance) // optimistic concurrency check
      .select("id");

    if (!claimed || claimed.length === 0) {
      return new Response(JSON.stringify({ error: "Balance changed - please retry the withdrawal." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = `ANCHOR_WITHDRAW_${userId}_${Date.now()}`;
    const transferRes = await anchorApiFetch("/transfers", "POST", {
      data: {
        type: "transfer",
        attributes: {
          amount: Math.round(amount * 100),
          currency: "NGN",
          reference,
          narration: narration || "UniMarket Anchor Wallet Bank Payout",
          destination: { accountNumber, accountName, bankName },
        },
      },
    });

    await admin.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      user_id: userId,
      type: "payout",
      amount,
      description: `Bank Transfer to ${accountName} (${bankName} - ${accountNumber})`,
      status: transferRes.ok ? "completed" : "failed",
    });

    await admin.from("payout_requests").insert({
      user_id: userId,
      wallet_id: wallet.id,
      amount,
      bank_account_name: accountName,
      bank_account_number: accountNumber,
      bank_name: bankName,
      status: transferRes.ok ? "completed" : "failed",
      admin_notes: transferRes.ok ? (narration || "Self-service Anchor instant bank transfer") : `Anchor transfer failed: ${transferRes.error}`,
    });

    if (!transferRes.ok) {
      // Refund the wallet debit - the transfer never actually went out.
      await admin.from("wallets").update({ available_balance: Number(wallet.available_balance) }).eq("user_id", userId);
      return new Response(JSON.stringify({ error: transferRes.error || "Bank transfer failed." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: `₦${amount.toLocaleString()} successfully transferred to ${accountName} (${bankName} - ${accountNumber})!` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("🔴 anchor-withdraw error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Withdrawal failed." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
