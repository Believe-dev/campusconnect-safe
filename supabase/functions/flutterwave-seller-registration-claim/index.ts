import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { completeSellerRegistration } from "../_shared/sellerPayment.ts";
import { hashClaimToken } from "../_shared/flutterwaveSellerRegistration.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: userData, error: authError } = await authClient.auth.getUser();
  if (authError || !userData.user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  try {
    const { txRef, claimToken } = await req.json();
    if (typeof txRef !== "string" || typeof claimToken !== "string") return Response.json({ error: "txRef and claimToken are required." }, { status: 400, headers: corsHeaders });
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: intent, error } = await admin.from("seller_signup_payment_intents")
      .select("id, email, amount, status, payment_reference, claim_token_hash").eq("payment_reference", txRef).single();
    if (error || !intent) return Response.json({ claimed: false, message: "Seller signup payment intent not found." }, { status: 404, headers: corsHeaders });
    if (userData.user.email?.toLowerCase() !== intent.email || (await hashClaimToken(claimToken)) !== intent.claim_token_hash) {
      return Response.json({ claimed: false, message: "This payment is not valid for the signed-in account." }, { status: 403, headers: corsHeaders });
    }
    if (intent.status === "claimed") return Response.json({ claimed: true, message: "Seller registration already activated." }, { headers: corsHeaders });
    if (intent.status !== "paid") return Response.json({ claimed: false, message: "Payment has not been verified yet." }, { status: 400, headers: corsHeaders });
    const { data: claimed, error: claimError } = await admin.from("seller_signup_payment_intents")
      .update({ status: "claiming", user_id: userData.user.id, updated_at: new Date().toISOString() }).eq("id", intent.id).eq("status", "paid").select("id");
    if (claimError) throw claimError;
    if (!claimed?.length) return Response.json({ claimed: false, message: "This payment is already being activated." }, { headers: corsHeaders });
    try {
      await completeSellerRegistration(admin, userData.user.id, intent.payment_reference, Number(intent.amount), "flutterwave");
      const { error: finishError } = await admin.from("seller_signup_payment_intents").update({ status: "claimed", updated_at: new Date().toISOString() }).eq("id", intent.id);
      if (finishError) throw finishError;
      return Response.json({ claimed: true, message: "Seller registration activated." }, { headers: corsHeaders });
    } catch (error) {
      await admin.from("seller_signup_payment_intents").update({ status: "paid", user_id: null, updated_at: new Date().toISOString() }).eq("id", intent.id);
      throw error;
    }
  } catch (error) {
    console.error("flutterwave seller signup claim failed", error);
    return Response.json({ claimed: false, message: error instanceof Error ? error.message : "Could not activate seller registration." }, { status: 500, headers: corsHeaders });
  }
});
