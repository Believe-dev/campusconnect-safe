// Retired: seller registration and subscription payments use Flutterwave.
// This tombstone prevents an old client bundle from creating new Anchor
// seller-payment intents while preserving the function name for a clear error.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  return new Response(JSON.stringify({ error: "Seller payments now use Flutterwave. Please refresh and try again." }), {
    status: 410,
    headers,
  });
});
