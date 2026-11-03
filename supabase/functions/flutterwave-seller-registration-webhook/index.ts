import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifySellerSignupPayment } from "../_shared/flutterwaveSellerRegistration.ts";

const safelyMatches = (actual: string | null, expected: string) => {
  if (!actual || actual.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i += 1) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
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
    if (!transactionId || typeof txRef !== "string") return new Response("Ignored", { status: 200 });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: intent, error } = await admin.from("seller_signup_payment_intents")
      .select("id, email, amount, status, payment_reference, claim_token_hash").eq("payment_reference", txRef).maybeSingle();
    if (error) throw error;
    if (!intent) return new Response("Ignored", { status: 200 });
    await verifySellerSignupPayment(admin, intent, String(transactionId));
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("flutterwave seller signup webhook failed", error);
    return new Response("Temporary processing failure", { status: 500 });
  }
});
