// Real KYC submission: calls Anchor's actual verification endpoint server-side (the key
// never touches the browser) and screens the applicant against the OFAC sanctions
// watchlist first. kyc_status is set to 'pending' here - it only becomes 'verified'
// (and only then does seller_status flip to 'approved') when the
// customer.identification.approved webhook arrives in anchor-webhook. This replaces the
// old client-side flow that instantly self-approved any 11-digit number.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { anchorApiFetch } from "../_shared/anchor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { bvnOrNin, dateOfBirth, gender } = await req.json();

    if (!bvnOrNin || bvnOrNin.length !== 11) {
      return new Response(JSON.stringify({ error: "A valid 11-digit BVN or NIN is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("full_name, email, phone_number, anchor_customer_id")
      .eq("user_id", userId)
      .single();

    if (profileErr || !profile) {
      throw new Error("Could not load profile for KYC submission.");
    }

    // --- Sanctions screening (OFAC) - Anchor does not do this; it's ours. ---
    const { data: screenMatches, error: screenErr } = await admin.rpc("screen_sanctions_name", {
      search_name: profile.full_name.toLowerCase().trim(),
      threshold: 0.5,
    });

    if (screenErr) {
      console.error("Sanctions screening query failed:", screenErr);
      throw new Error("Sanctions screening is temporarily unavailable. Please try again shortly.");
    }

    const flagged = Array.isArray(screenMatches) && screenMatches.length > 0;

    await admin
      .from("sanctions_screenings")
      .insert({
        user_id: userId,
        screened_name: profile.full_name,
        result: flagged ? "flagged" : "clear",
        matched_watchlist_name: flagged ? screenMatches[0].full_name : null,
        match_score: flagged ? screenMatches[0].score : null,
      });

    await admin
      .from("profiles")
      .update({ sanctions_status: flagged ? "flagged" : "clear", sanctions_screened_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (flagged) {
      // Do not proceed to Anchor at all - this requires manual admin review.
      await admin
        .from("profiles")
        .update({
          kyc_status: "rejected",
          kyc_rejection_reason: "Flagged by sanctions screening - pending manual review.",
        })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({
          success: false,
          status: "flagged",
          message: "Your submission requires manual review before it can proceed. Our team will be in touch.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Ensure an Anchor customer exists for this user. ---
    let anchorCustomerId = profile.anchor_customer_id;
    if (!anchorCustomerId) {
      const custRes = await anchorApiFetch("/customers", "POST", {
        data: {
          type: "customer",
          attributes: {
            type: "INDIVIDUAL",
            email: profile.email,
            fullName: profile.full_name,
            phoneNumber: profile.phone_number || "08012345678",
          },
        },
      });

      if (!custRes.ok || !custRes.data?.data?.id) {
        throw new Error(custRes.error || "Failed to create Anchor customer.");
      }
      anchorCustomerId = custRes.data.data.id;
      await admin.from("profiles").update({ anchor_customer_id: anchorCustomerId }).eq("user_id", userId);
    }

    // --- Submit for Tier 1 KYC verification. ---
    // Per docs.getanchor.co/docs/individual-customer-kyc: Tier 1 validation is
    // automatic and the result normally arrives via webhook (customer.identification.
    // approved/rejected/error) almost immediately.
    const verificationRes = await anchorApiFetch(`/customers/${anchorCustomerId}/verification/individual`, "POST", {
      data: {
        type: "Verification",
        attributes: {
          level: "TIER_1",
          level2: {
            bvn: bvnOrNin,
            dateOfBirth: dateOfBirth || undefined,
            gender: gender || undefined,
          },
        },
      },
    });

    if (!verificationRes.ok) {
      await admin
        .from("profiles")
        .update({ kyc_status: "rejected", kyc_rejection_reason: verificationRes.error || "Anchor rejected the verification request." })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({ success: false, status: "rejected", message: verificationRes.error || "Verification submission failed." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Submitted successfully - awaiting Anchor's async result via webhook.
    // seller_status is deliberately NOT touched here; only the webhook sets it to 'approved'.
    await admin
      .from("profiles")
      .update({
        kyc_status: "pending",
        bvn_or_nin: bvnOrNin,
        kyc_rejection_reason: null,
      })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({
        success: true,
        status: "pending",
        message: "Submitted to Anchor for verification. This is usually confirmed within a few moments.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("🔴 anchor-kyc-submit error:", err);
    return new Response(JSON.stringify({ error: err?.message || "KYC submission failed." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
