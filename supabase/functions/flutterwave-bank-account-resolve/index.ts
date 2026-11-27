import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveFlutterwaveBankAccount } from "../_shared/flutterwavePayout.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data, error: authError } = await authClient.auth.getUser();
  if (authError || !data.user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

  try {
    const { accountNumber, bankCode } = await req.json();
    if (typeof accountNumber !== "string" || !/^\d{10}$/.test(accountNumber) || typeof bankCode !== "string" || !/^[A-Za-z0-9]+$/.test(bankCode)) {
      return Response.json({ error: "A valid bank code and 10-digit account number are required." }, { status: 400, headers: corsHeaders });
    }
    return Response.json(await resolveFlutterwaveBankAccount(accountNumber, bankCode), { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not resolve this bank account." }, { status: 400, headers: corsHeaders });
  }
});
