// Retired after the Flutterwave checkout migration. Keeping a tombstone at
// the original endpoint stops stale browser bundles from opening new Anchor
// payment instructions.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return Response.json(
    { error: "Anchor checkout has been retired. Please start checkout again." },
    { status: 410, headers: corsHeaders },
  );
});
