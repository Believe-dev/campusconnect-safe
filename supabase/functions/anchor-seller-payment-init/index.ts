// Creates (or reuses) an Anchor customer for the caller, then a fresh
// Sub-Ledger account under the platform deposit account for this specific
// seller payment (registration fee or monthly renewal) - the same pattern
// anchor-checkout uses for orders, just for a seller_payment_intents row
// instead. The buyer transfers to the NUBAN this returns; payment is only
// confirmed by anchor-seller-payment-verify or the nip.inbound.completed
// webhook, never by the client declaring success on its own.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { anchorApiFetch } from "../_shared/anchor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FEES: Record<string, number> = {
  registration: 1000,
  renewal: 1000,
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
    const { purpose } = await req.json();
    if (purpose !== "registration" && purpose !== "renewal") {
      return new Response(JSON.stringify({ error: "purpose must be 'registration' or 'renewal'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email, phone_number, anchor_customer_id, account_type, seller_registration_paid")
      .eq("user_id", userId)
      .single();

    if (!profile) throw new Error("Profile not found.");

    if (purpose === "registration" && profile.seller_registration_paid) {
      return new Response(JSON.stringify({ error: "You've already completed seller registration." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (purpose === "renewal" && profile.account_type !== "seller" && profile.account_type !== "both") {
      return new Response(JSON.stringify({ error: "Complete seller registration before renewing." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const depositAccountId = Deno.env.get("ANCHOR_DEPOSIT_ACCOUNT_ID");
    if (!depositAccountId) {
      throw new Error("ANCHOR_DEPOSIT_ACCOUNT_ID is not configured - cannot create a Sub-Ledger account for this payment.");
    }

    let anchorCustomerId = profile.anchor_customer_id;
    if (!anchorCustomerId) {
      const custRes = await anchorApiFetch("/customers", "POST", {
        data: {
          type: "customer",
          attributes: {
            type: "INDIVIDUAL",
            email: profile.email,
            fullName: profile.full_name,
            phoneNumber: profile.phone_number || "08012345678",
          },
        },
      });
      if (!custRes.ok || !custRes.data?.data?.id) {
        throw new Error(custRes.error || "Failed to create Anchor customer.");
      }
      anchorCustomerId = custRes.data.data.id;
      await admin.from("profiles").update({ anchor_customer_id: anchorCustomerId }).eq("user_id", userId);
    }

    // Superseded by the new intent below - avoids orphaned pending intents
    // (and their sub-accounts) piling up if a user abandons payment and
    // starts over.
    await admin
      .from("seller_payment_intents")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("purpose", purpose)
      .eq("status", "pending");

    const amount = FEES[purpose];

    const subAccountRes = await anchorApiFetch("/sub-accounts", "POST", {
      data: {
        type: "SubAccount",
        attributes: {
          productName: `Seller ${purpose} - ${userId}`,
        },
        relationships: {
          customer: { data: { type: "Customer", id: anchorCustomerId } },
          account: { data: { type: "DepositAccount", id: depositAccountId } },
        },
      },
    });

    if (!subAccountRes.ok || !subAccountRes.data?.data?.id) {
      throw new Error(subAccountRes.error || "Failed to create Anchor Sub-Ledger account for this payment.");
    }

    const subAccount = subAccountRes.data.data;
    const accountNumber = subAccount.attributes?.accountNumber || subAccount.attributes?.virtualNuban?.accountNumber;
    const bankName = subAccount.attributes?.bank?.name || "CoreStep Microfinance / Anchor";

    const { data: intent, error: intentErr } = await admin
      .from("seller_payment_intents")
      .insert({
        user_id: userId,
        purpose,
        amount,
        anchor_sub_account_id: subAccount.id,
        anchor_sub_account_number: accountNumber,
        anchor_bank_name: bankName,
      })
      .select("id")
      .single();

    if (intentErr || !intent) throw intentErr || new Error("Failed to create payment intent.");

    return new Response(
      JSON.stringify({
        success: true,
        intentId: intent.id,
        nubanAccount: accountNumber,
        bankName,
        amount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("🔴 anchor-seller-payment-init error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Failed to start payment." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
