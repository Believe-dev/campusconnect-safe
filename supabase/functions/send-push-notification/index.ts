import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

webpush.setVapidDetails(
  "mailto:support@unimarket.com.ng",
  Deno.env.get("VAPID_PUBLIC_KEY") ?? "",
  Deno.env.get("VAPID_PRIVATE_KEY") ?? ""
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { user_id, title, message, data } = await req.json();

    if (!user_id || !title || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: subscriptions, error: fetchError } = await supabaseClient
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (fetchError) throw fetchError;

    const payload = JSON.stringify({ title, body: message, data: data || {} });

    const results = await Promise.all(
      (subscriptions ?? []).map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          return { id: sub.id, success: true };
        } catch (error) {
          // 404/410 means the browser has expired or unsubscribed this
          // device — clean it up so future sends don't keep retrying it.
          if (error.statusCode === 404 || error.statusCode === 410) {
            await supabaseClient.from("push_subscriptions").delete().eq("id", sub.id);
          }
          return { id: sub.id, success: false, error: error.message };
        }
      })
    );

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
