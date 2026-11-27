// Retired after the Flutterwave payout migration. A dedicated response keeps
// stale browser bundles from creating a second external-payout path.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return Response.json(
    { error: "Anchor withdrawals have been retired. Please use the Flutterwave withdrawal flow." },
    { status: 410, headers: corsHeaders },
  );
});
