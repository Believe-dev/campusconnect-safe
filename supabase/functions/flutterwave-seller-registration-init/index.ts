import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashClaimToken } from "../_shared/flutterwaveSellerRegistration.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const registrationFee = 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { email, fullName, phone } = await req.json();
    if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email) || typeof fullName !== "string" || typeof phone !== "string") {
      return Response.json({ error: "A valid name, email, and phone number are required." }, { status: 400, headers: corsHeaders });
    }
    const secretKey = Deno.env.get("FLW_SECRET_KEY");
    if (!secretKey) throw new Error("Flutterwave is not configured yet.");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const txRef = `seller-signup-${crypto.randomUUID()}`;
    const claimToken = crypto.randomUUID();
    const { error: intentError } = await admin.from("seller_signup_payment_intents").insert({
      email: email.trim().toLowerCase(),
      amount: registrationFee,
      payment_reference: txRef,
      claim_token_hash: await hashClaimToken(claimToken),
    });
    if (intentError) throw intentError;

    const origin = req.headers.get("origin");
    if (!origin) throw new Error("Missing request origin.");
    const redirectUrl = new URL("/seller-registration-payment-callback", origin).toString();
    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: registrationFee,
        currency: "NGN",
        redirect_url: redirectUrl,
        customer: { email, name: fullName, phonenumber: phone },
        customizations: { title: "UniMarket seller registration", description: "Seller registration fee" },
        configuration: { session_duration: 30, max_retry_attempt: 5 },
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.status !== "success" || !payload?.data?.link) {
      await admin.from("seller_signup_payment_intents").update({ status: "expired" }).eq("payment_reference", txRef);
      throw new Error(payload?.message || "Flutterwave could not create a checkout link.");
    }
    return Response.json({ paymentLink: payload.data.link, claimToken }, { headers: corsHeaders });
  } catch (error) {
    console.error("flutterwave seller signup init failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Failed to start Flutterwave checkout." }, { status: 500, headers: corsHeaders });
  }
});
