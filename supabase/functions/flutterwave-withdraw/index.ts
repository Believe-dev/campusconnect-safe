// Retired: seller withdrawals are manually processed after three business days.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  return new Response(JSON.stringify({ error: "Withdrawals are now processed manually. Please refresh and submit a manual withdrawal request." }), {
    status: 410,
    headers,
  });
});
