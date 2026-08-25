// Sends a 6-digit OTP to verify phone number ownership - this flow previously did not
// exist at all despite phone_number being a plain, unverified editable profile field.
// OTP generation/expiry/attempt-limiting is handled here (not delegated to the SMS
// provider) so the provider is swappable; Termii is used as the default transport.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OTP_TTL_MINUTES = 10;

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: authError } = await authClient.auth.getUser();
  if (authError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { phoneNumber } = await req.json();
    if (!phoneNumber || !/^\+?\d{10,14}$/.test(phoneNumber)) {
      return new Response(JSON.stringify({ error: "A valid phone number is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await sha256Hex(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    const { error: insertErr } = await admin.from("phone_verifications").insert({
      user_id: userId,
      phone_number: phoneNumber,
      otp_hash: otpHash,
      expires_at: expiresAt,
    });
    if (insertErr) throw insertErr;

    const termiiApiKey = Deno.env.get("TERMII_API_KEY");
    const termiiSenderId = Deno.env.get("TERMII_SENDER_ID") || "CampusConn";

    if (!termiiApiKey) {
      // No SMS provider configured (expected in sandbox) - log so the flow is still
      // testable end-to-end, but never claim a real SMS went out.
      console.log(`ℹ️ TERMII_API_KEY not set - OTP for ${phoneNumber} (user ${userId}): ${otp}`);
      return new Response(
        JSON.stringify({ success: true, message: "OTP generated (SMS provider not configured - check function logs).", devOtp: otp }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smsRes = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: termiiApiKey,
        to: phoneNumber.replace(/^\+/, ""),
        from: termiiSenderId,
        sms: `Your CampusConnect verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
        type: "plain",
        channel: "dnd",
      }),
    });

    if (!smsRes.ok) {
      const errText = await smsRes.text();
      console.error("🔴 Termii SMS send failed:", errText);
      return new Response(JSON.stringify({ error: "Failed to send verification code. Please try again." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Verification code sent." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("🔴 phone-otp-send error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Failed to send verification code." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
