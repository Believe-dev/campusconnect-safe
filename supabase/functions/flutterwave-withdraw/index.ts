import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { initiateFlutterwaveTransfer, resolveFlutterwaveBankAccount } from "../_shared/flutterwavePayout.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: authError } = await authClient.auth.getUser();
  if (authError || !userData.user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

  let payoutId: string | null = null;
  let admin: any = null;
  try {
    const { bankName, bankCode, accountNumber, amount, narration } = await req.json();
    const withdrawalAmount = Number(amount);
    if (typeof bankName !== "string" || !bankName.trim() || typeof bankCode !== "string" || !/^[A-Za-z0-9]+$/.test(bankCode) ||
      typeof accountNumber !== "string" || !/^\d{10}$/.test(accountNumber) || !Number.isFinite(withdrawalAmount) ||
      withdrawalAmount < 100 || withdrawalAmount !== Math.round(withdrawalAmount * 100) / 100) {
      return Response.json({ error: "Valid bank details and a withdrawal of at least ₦100 are required." }, { status: 400, headers: corsHeaders });
    }

    admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile, error: profileError } = await admin.from("profiles").select("kyc_status").eq("user_id", userData.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (profile?.kyc_status !== "verified") {
      return Response.json({ error: "Complete identity verification (BVN/NIN) before requesting a withdrawal." }, { status: 403, headers: corsHeaders });
    }

    // Do not make a second provider request while the status of an earlier
    // one is still unknown. This protects a seller from a duplicate payout
    // after a timeout or a delayed Flutterwave response.
    const { data: pendingPayout, error: pendingPayoutError } = await admin.from("payout_requests")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("payout_provider", "flutterwave")
      .in("transfer_status", ["processing", "pending"])
      .limit(1)
      .maybeSingle();
    if (pendingPayoutError) throw pendingPayoutError;
    if (pendingPayout) {
      return Response.json({ error: "A previous payout is still processing. Please wait for it to finish before requesting another withdrawal." }, { status: 409, headers: corsHeaders });
    }

    // Resolve on the server immediately before a payout. The caller never gets
    // to choose the beneficiary name that will be recorded or paid.
    const resolved = await resolveFlutterwaveBankAccount(accountNumber, bankCode);
    const reference = `FLW_PAYOUT_${crypto.randomUUID()}`;
    const { data: payoutRows, error: payoutError } = await admin.rpc("create_flutterwave_payout_request", {
      p_user_id: userData.user.id,
      p_amount: withdrawalAmount,
      p_bank_name: bankName.trim(),
      p_bank_code: bankCode,
      p_account_number: accountNumber,
      p_account_name: resolved.accountName,
      p_reference: reference,
      p_narration: typeof narration === "string" ? narration.slice(0, 140) : null,
    });
    if (payoutError) return Response.json({ error: payoutError.message }, { status: 400, headers: corsHeaders });
    const payout = payoutRows?.[0];
    if (!payout?.payout_id) throw new Error("Could not create payout request.");
    payoutId = payout.payout_id;

    const webhookUrl = new URL("/functions/v1/flutterwave-webhook", Deno.env.get("SUPABASE_URL")!).toString();
    const transfer = await initiateFlutterwaveTransfer({
      accountNumber,
      bankCode,
      amount: withdrawalAmount,
      narration: typeof narration === "string" && narration.trim() ? narration.slice(0, 140) : "UniMarket wallet payout",
      reference,
      callbackUrl: webhookUrl,
    });

    const providerTransferId = transfer.payload?.data?.id ? String(transfer.payload.data.id) : null;
    const providerStatus = transfer.payload?.data?.status?.toUpperCase();
    if (transfer.ok && providerStatus === "FAILED") {
      await admin.rpc("settle_flutterwave_payout", {
        p_payout_id: payout.payout_id,
        p_provider_transfer_id: providerTransferId,
        p_success: false,
        p_note: transfer.payload?.data?.complete_message || transfer.payload?.message || "Flutterwave rejected the transfer.",
      });
      return Response.json({ error: transfer.payload?.data?.complete_message || "Flutterwave could not process this payout." }, { status: 502, headers: corsHeaders });
    }

    if (!transfer.ok && transfer.status >= 400 && transfer.status < 500) {
      await admin.rpc("settle_flutterwave_payout", {
        p_payout_id: payoutId,
        p_provider_transfer_id: providerTransferId,
        p_success: false,
        p_note: transfer.payload?.message || `Flutterwave rejected the payout request (HTTP ${transfer.status}).`,
      });
      return Response.json({ error: transfer.payload?.message || "Flutterwave rejected this payout." }, { status: 502, headers: corsHeaders });
    }

    if (!transfer.ok) {
      // A timeout/server failure can be ambiguous: the provider may still have
      // received the transfer. Leave the reserved amount pending for webhook or
      // staff reconciliation instead of risking an immediate double payout.
      await admin.from("payout_requests").update({
        admin_notes: `Flutterwave submission needs reconciliation: ${transfer.payload?.message || `HTTP ${transfer.status}`}`,
        provider_transfer_id: providerTransferId,
        updated_at: new Date().toISOString(),
      }).eq("id", payout.payout_id);
      return Response.json({ success: true, pending: true, message: "Your payout is being reconciled. Please do not submit it again." }, { headers: corsHeaders });
    }

    await admin.from("payout_requests").update({
      provider_transfer_id: providerTransferId,
      admin_notes: transfer.payload?.data?.complete_message || "Flutterwave payout submitted.",
      updated_at: new Date().toISOString(),
    }).eq("id", payout.payout_id);

    if (providerStatus === "SUCCESSFUL") {
      await admin.rpc("settle_flutterwave_payout", {
        p_payout_id: payout.payout_id,
        p_provider_transfer_id: providerTransferId,
        p_success: true,
        p_note: transfer.payload?.data?.complete_message || "Flutterwave payout completed.",
      });
      return Response.json({ success: true, completed: true, message: `₦${withdrawalAmount.toLocaleString()} was transferred to ${resolved.accountName}.` }, { headers: corsHeaders });
    }

    return Response.json({ success: true, pending: true, message: `₦${withdrawalAmount.toLocaleString()} payout is processing. We will update your wallet history when it completes.` }, { headers: corsHeaders });
  } catch (error) {
    console.error("flutterwave withdrawal failed", error);
    if (payoutId && admin) {
      await admin.from("payout_requests").update({
        admin_notes: `Flutterwave submission needs reconciliation: ${error instanceof Error ? error.message : "Unknown error"}`,
        updated_at: new Date().toISOString(),
      }).eq("id", payoutId);
      return Response.json({ success: true, pending: true, message: "Your payout is being reconciled. Please do not submit it again." }, { headers: corsHeaders });
    }
    return Response.json({ error: error instanceof Error ? error.message : "Withdrawal failed." }, { status: 500, headers: corsHeaders });
  }
});
