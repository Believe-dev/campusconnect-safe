import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const sellerFee = 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: authError } = await authClient.auth.getUser();
  if (authError || !userData.user?.email) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

  try {
    const secretKey = Deno.env.get("FLW_SECRET_KEY");
    if (!secretKey) throw new Error("Flutterwave is not configured yet.");

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("full_name, phone_number, seller_registration_paid")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (profileError || !profile) throw profileError || new Error("Your profile was not found.");

    // The server decides the purpose. A browser cannot pay the cheaper or
    // wrong membership step by changing a request value.
    const purpose = profile.seller_registration_paid ? "renewal" : "registration";
    const paymentReference = `seller-membership-${crypto.randomUUID()}`;
    const { error: intentError } = await admin.from("flutterwave_seller_membership_payment_intents").insert({
      user_id: userData.user.id,
      purpose,
      amount: sellerFee,
      payment_reference: paymentReference,
    });
    if (intentError) throw intentError;

    const redirectBaseUrl = Deno.env.get("APP_URL") || req.headers.get("origin");
    if (!redirectBaseUrl) throw new Error("APP_URL is not configured and no request origin was supplied.");
    const redirectUrl = new URL("/seller-membership-payment-callback", redirectBaseUrl).toString();
    const customerName = profile.full_name || userData.user.email.split("@")[0];
    const paymentResponse = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        tx_ref: paymentReference,
        amount: sellerFee,
        currency: "NGN",
        redirect_url: redirectUrl,
        customer: { email: userData.user.email, name: customerName, phonenumber: profile.phone_number || undefined },
        customizations: {
          title: purpose === "renewal" ? "UniMarket seller subscription renewal" : "UniMarket seller registration",
          description: purpose === "renewal" ? "Monthly seller subscription" : "Seller registration fee",
        },
        configuration: { session_duration: 30, max_retry_attempt: 5 },
        meta: { seller_membership_payment_reference: paymentReference, user_id: userData.user.id, purpose },
      }),
    });
    const paymentPayload = await paymentResponse.json().catch(() => null);
    if (!paymentResponse.ok || paymentPayload?.status !== "success" || !paymentPayload?.data?.link) {
      await admin.from("flutterwave_seller_membership_payment_intents")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("payment_reference", paymentReference);
      throw new Error(paymentPayload?.message || "Flutterwave could not create a checkout link.");
    }

    return Response.json({ paymentLink: paymentPayload.data.link, paymentReference, amount: sellerFee, purpose }, { headers: corsHeaders });
  } catch (error) {
    console.error("flutterwave seller membership init failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Failed to start Flutterwave checkout." }, { status: 500, headers: corsHeaders });
  }
});
