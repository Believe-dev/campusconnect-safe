import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;

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
    const { code } = await req.json();
    if (!code) {
      return new Response(JSON.stringify({ error: "Verification code is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pending, error: fetchErr } = await admin
      .from("phone_verifications")
      .select("id, phone_number, otp_hash, attempts, expires_at, verified_at")
      .eq("user_id", userId)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr || !pending) {
      return new Response(JSON.stringify({ verified: false, message: "No pending verification found. Request a new code." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(pending.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ verified: false, message: "This code has expired. Request a new one." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pending.attempts >= MAX_ATTEMPTS) {
      return new Response(JSON.stringify({ verified: false, message: "Too many incorrect attempts. Request a new code." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const submittedHash = await sha256Hex(code);
    if (submittedHash !== pending.otp_hash) {
      await admin.from("phone_verifications").update({ attempts: pending.attempts + 1 }).eq("id", pending.id);
      return new Response(JSON.stringify({ verified: false, message: "Incorrect code." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("phone_verifications").update({ verified_at: new Date().toISOString() }).eq("id", pending.id);
    await admin
      .from("profiles")
      .update({
        phone_number: pending.phone_number,
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return new Response(JSON.stringify({ verified: true, message: "Phone number verified." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("🔴 phone-otp-verify error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Verification failed." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
