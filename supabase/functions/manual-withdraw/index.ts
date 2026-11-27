import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: authError } = await authClient.auth.getUser();
  if (authError || !userData.user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

  try {
    const { bankName, accountNumber, accountName, amount } = await req.json();
    const withdrawalAmount = Number(amount);
    if (
      typeof bankName !== "string" || !bankName.trim() || bankName.trim().length > 120 ||
      typeof accountName !== "string" || !accountName.trim() || accountName.trim().length > 160 ||
      typeof accountNumber !== "string" || !/^\d{10}$/.test(accountNumber) ||
      !Number.isFinite(withdrawalAmount) || withdrawalAmount < 100 || withdrawalAmount !== Math.round(withdrawalAmount * 100) / 100
    ) {
      return Response.json({ error: "Enter a valid bank name, account name, 10-digit account number, and withdrawal of at least ₦100." }, { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("kyc_status")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.kyc_status !== "verified") {
      return Response.json({ error: "Complete identity verification (BVN/NIN) before requesting a withdrawal." }, { status: 403, headers: corsHeaders });
    }

    const { data: payoutRows, error: payoutError } = await admin.rpc("create_manual_payout_request", {
      p_user_id: userData.user.id,
      p_amount: withdrawalAmount,
      p_bank_name: bankName.trim(),
      p_account_number: accountNumber,
      p_account_name: accountName.trim(),
    });
    if (payoutError) return Response.json({ error: payoutError.message }, { status: 400, headers: corsHeaders });

    const payout = payoutRows?.[0];
    if (!payout?.payout_id || !payout.available_for_processing_on) throw new Error("Could not create the withdrawal request.");
    return Response.json({
      success: true,
      payoutId: payout.payout_id,
      availableForProcessingOn: payout.available_for_processing_on,
      message: `Your withdrawal request was received. It will be processed within 3 business days (from ${payout.available_for_processing_on}).`,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("manual withdrawal request failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Could not create withdrawal request." }, { status: 500, headers: corsHeaders });
  }
});
