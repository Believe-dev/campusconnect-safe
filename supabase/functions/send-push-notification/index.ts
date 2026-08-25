import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
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

    // Send OneSignal notification
    const oneSignalResponse = await fetch(
      "https://onesignal.com/api/v1/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Deno.env.get("ONESIGNAL_API_KEY")}`,
        },
        body: JSON.stringify({
          app_id: "2c42e82a-a1c6-4bf8-bb8b-67106cf7d92c",
          include_external_user_ids: [user_id],
          headings: { en: title },
          contents: { en: message },
          data: data || {},
          web_url: data?.url || "/notifications",
          chrome_web_icon: "/logo.png",
          chrome_web_badge: "/logo.png",
        }),
      }
    );

    const oneSignalResult = await oneSignalResponse.json();

    return new Response(
      JSON.stringify({
        success: oneSignalResponse.ok,
        result: oneSignalResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
