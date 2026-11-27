import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  verifyAndSettleFlutterwaveSellerMembershipPayment,
  type SellerMembershipPaymentIntent,
} from "../_shared/flutterwaveSellerMembership.ts";

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
    const { transactionId, txRef } = await req.json();
    if ((typeof transactionId !== "string" && typeof transactionId !== "number") || typeof txRef !== "string" || !txRef) {
      return Response.json({ error: "transactionId and txRef are required." }, { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: intent, error } = await admin.from("flutterwave_seller_membership_payment_intents")
      .select("id, user_id, purpose, amount, currency, payment_reference, flutterwave_transaction_id, status")
      .eq("payment_reference", txRef)
      .maybeSingle();
    if (error) throw error;
    if (!intent || intent.user_id !== userData.user.id) {
      return Response.json({ verified: false, completed: false, message: "Seller payment intent not found." }, { status: 404, headers: corsHeaders });
    }

    const result = await verifyAndSettleFlutterwaveSellerMembershipPayment(
      admin,
      intent as SellerMembershipPaymentIntent,
      String(transactionId)
    );
    return Response.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error("flutterwave seller membership verification failed", error);
    return Response.json({ verified: false, completed: false, message: error instanceof Error ? error.message : "Payment verification failed." }, { status: 500, headers: corsHeaders });
  }
});
