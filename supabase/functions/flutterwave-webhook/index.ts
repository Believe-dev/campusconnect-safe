import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifySellerSignupPayment } from "../_shared/flutterwaveSellerRegistration.ts";
import {
  verifyAndSettleFlutterwaveSellerMembershipPayment,
  type SellerMembershipPaymentIntent,
} from "../_shared/flutterwaveSellerMembership.ts";
import { processFlutterwaveOrderWebhook } from "../_shared/flutterwaveProductCheckout.ts";
import { processFlutterwavePayoutWebhook } from "../_shared/flutterwavePayout.ts";

const safelyMatches = (actual: string | null, expected: string) => {
  if (!actual || actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
};

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secretHash = Deno.env.get("FLW_SECRET_HASH");
  if (!secretHash || !safelyMatches(req.headers.get("verif-hash"), secretHash)) return new Response("Invalid webhook signature", { status: 401 });

  try {
    const payload = await req.json();
    const transactionId = payload?.data?.id;
    const txRef = payload?.data?.tx_ref;
    if (typeof transactionId !== "number" && typeof transactionId !== "string") {
      return new Response("Ignored", { status: 200 });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (typeof txRef === "string" && await processFlutterwaveOrderWebhook(admin, payload)) return new Response("OK", { status: 200 });
    if (await processFlutterwavePayoutWebhook(admin, payload)) return new Response("OK", { status: 200 });

    if (typeof txRef === "string" && txRef.startsWith("seller-membership-")) {
      const { data: intent, error } = await admin.from("flutterwave_seller_membership_payment_intents")
        .select("id, user_id, purpose, amount, currency, payment_reference, flutterwave_transaction_id, status")
        .eq("payment_reference", txRef)
        .maybeSingle();
      if (error) throw error;
      if (!intent) return new Response("Ignored", { status: 200 });
      await verifyAndSettleFlutterwaveSellerMembershipPayment(admin, intent as SellerMembershipPaymentIntent, String(transactionId));
      return new Response("OK", { status: 200 });
    }

    if (typeof txRef !== "string" || !txRef.startsWith("seller-signup-")) return new Response("Ignored", { status: 200 });
    const { data: intent, error } = await admin.from("seller_signup_payment_intents")
      .select("id, email, amount, status, payment_reference, claim_token_hash")
      .eq("payment_reference", txRef)
      .maybeSingle();
    if (error) throw error;
    if (!intent) return new Response("Ignored", { status: 200 });
    await verifySellerSignupPayment(admin, intent, String(transactionId));
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("flutterwave webhook failed", error);
    return new Response("Temporary processing failure", { status: 500 });
  }
});
