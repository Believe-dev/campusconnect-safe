import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyFlutterwaveOrderPayment } from "../_shared/flutterwaveProductCheckout.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: authError } = await authClient.auth.getUser();
  if (authError || !userData.user) return Response.json({ verified: false, message: "Unauthorized" }, { status: 401, headers: corsHeaders });

  try {
    const { transactionId, txRef } = await req.json();
    if (typeof transactionId !== "string" || typeof txRef !== "string" || !transactionId || !txRef) {
      return Response.json({ verified: false, message: "transactionId and txRef are required." }, { status: 400, headers: corsHeaders });
    }
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: attempt, error } = await admin.from("flutterwave_order_payment_attempts")
      .select("id, order_id, buyer_id, cart_item_ids, payment_reference, amount, currency, status, flutterwave_transaction_id")
      .eq("payment_reference", txRef)
      .maybeSingle();
    if (error) throw error;
    if (!attempt || attempt.buyer_id !== userData.user.id) {
      return Response.json({ verified: false, message: "Payment attempt not found." }, { status: 404, headers: corsHeaders });
    }
    return Response.json(await verifyFlutterwaveOrderPayment(admin, attempt, transactionId), { headers: corsHeaders });
  } catch (error) {
    console.error("flutterwave product checkout verification failed", error);
    return Response.json({ verified: false, message: error instanceof Error ? error.message : "Payment verification failed." }, { status: 500, headers: corsHeaders });
  }
});
