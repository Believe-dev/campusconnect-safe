import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifySellerSignupPayment } from "../_shared/flutterwaveSellerRegistration.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  try {
    const { transactionId, txRef, claimToken } = await req.json();
    if (![transactionId, txRef, claimToken].every((value) => typeof value === "string" && value)) {
      return Response.json({ error: "transactionId, txRef, and claimToken are required." }, { status: 400, headers: corsHeaders });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: intent, error } = await admin.from("seller_signup_payment_intents")
      .select("id, email, amount, status, payment_reference, claim_token_hash").eq("payment_reference", txRef).single();
    if (error || !intent) return Response.json({ verified: false, message: "Seller signup payment intent not found." }, { status: 404, headers: corsHeaders });
    return Response.json(await verifySellerSignupPayment(admin, intent, transactionId, claimToken), { headers: corsHeaders });
  } catch (error) {
    console.error("flutterwave seller signup verification failed", error);
    return Response.json({ verified: false, message: error instanceof Error ? error.message : "Payment verification failed." }, { status: 500, headers: corsHeaders });
  }
});
