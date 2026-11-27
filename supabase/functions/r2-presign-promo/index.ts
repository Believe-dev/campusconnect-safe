import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Same presigned-PUT pattern as r2-presign (same R2 bucket, just a distinct
// "promos/" key prefix), but a different auth boundary: that one gates on
// "approved seller", which most admins aren't - this gates on the
// 'promotions' admin permission (or Super Admin) instead, since it's used
// for promo banner images and custom (non-catalog) promo product images.
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: hasPermission, error: permError } = await supabaseClient.rpc(
      "has_admin_permission",
      { _user_id: user.id, _tab_key: "promotions" }
    );
    const { data: isSuperAdmin, error: superError } = await supabaseClient.rpc(
      "is_super_admin",
      { _user_id: user.id }
    );

    if (permError || superError || !(hasPermission || isSuperAdmin)) {
      return new Response(
        JSON.stringify({ error: "You do not have permission to manage promotions." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { contentType } = await req.json();
    const ext = ALLOWED_TYPES[contentType];
    if (!ext) {
      return new Response(JSON.stringify({ error: "Unsupported content type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = `promos/${user.id}/${crypto.randomUUID()}.${ext}`;

    const accountId = Deno.env.get("R2_ACCOUNT_ID") ?? "";
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") ?? "";
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "";
    const bucket = Deno.env.get("R2_BUCKET_NAME") ?? "";
    const publicUrl = Deno.env.get("R2_PUBLIC_URL") ?? "";

    const r2 = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
      region: "auto",
    });

    const objectEndpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;

    const signedRequest = await r2.sign(objectEndpoint, {
      method: "PUT",
      aws: { signQuery: true },
      headers: { "content-type": contentType },
    });

    return new Response(
      JSON.stringify({
        uploadUrl: signedRequest.url,
        publicUrl: `${publicUrl}/${key}`,
        key,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
