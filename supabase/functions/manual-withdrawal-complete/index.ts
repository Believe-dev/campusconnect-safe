import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: authError } = await authClient.auth.getUser();
  if (authError || !userData.user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

  try {
    const { payoutId, transferReference, notes } = await req.json();
    if (typeof payoutId !== "string" || !payoutId || typeof transferReference !== "string" || !transferReference.trim()) {
      return Response.json({ error: "A withdrawal request and bank-transfer reference are required." }, { status: 400, headers: corsHeaders });
    }
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: hasPermission, error: permissionError } = await admin.rpc("has_admin_permission", {
      _user_id: userData.user.id,
      _tab_key: "escrow",
    });
    if (permissionError) throw permissionError;
    if (!hasPermission) return Response.json({ error: "You do not have permission to complete withdrawals." }, { status: 403, headers: corsHeaders });

    const { error: completionError } = await admin.rpc("complete_manual_payout_request", {
      p_payout_id: payoutId,
      p_processed_by: userData.user.id,
      p_transfer_reference: transferReference.trim(),
      p_notes: typeof notes === "string" ? notes.trim().slice(0, 1000) || null : null,
    });
    if (completionError) return Response.json({ error: completionError.message }, { status: 400, headers: corsHeaders });
    return Response.json({ success: true, message: "Manual withdrawal marked completed." }, { headers: corsHeaders });
  } catch (error) {
    console.error("manual withdrawal completion failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Could not complete withdrawal." }, { status: 500, headers: corsHeaders });
  }
});
