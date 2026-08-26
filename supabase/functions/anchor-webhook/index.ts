// Public endpoint Anchor calls to deliver webhook events. This is the authoritative
// source for "payment received", "KYC status changed", and "release/reversal
// confirmed" - the client never gets to declare these things true on its own.
//
// NOTE ON PAYLOAD SHAPE: Anchor's public docs describe event *names*
// (customer.identification.approved, nip.inbound.completed, etc.) and the JSON:API
// envelope used across their REST API, but do not publish a full example of a
// delivered webhook body. Field extraction below is defensive - it checks several
// plausible locations for the event type/id/resource ids. Before going live, replay
// a real event from the Anchor sandbox dashboard (Developers -> Events -> Send a
// sample event) and confirm these paths against the actual payload; adjust
// extractEventType/extractEventId/extractCustomerId/extractAccountId if they differ.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAnchorWebhookSignature } from "../_shared/anchor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-anchor-signature",
};

function extractEventType(payload: any): string | null {
  return payload?.eventType || payload?.event || payload?.type || payload?.data?.attributes?.eventType || null;
}

function extractEventId(payload: any): string | null {
  return payload?.eventId || payload?.id || payload?.data?.id || null;
}

function extractCustomerId(payload: any): string | null {
  return (
    payload?.data?.relationships?.customer?.data?.id ||
    payload?.data?.attributes?.customerId ||
    payload?.data?.id ||
    null
  );
}

function extractDestinationAccountId(payload: any): string | null {
  const attrs = payload?.data?.attributes || {};
  return (
    payload?.data?.relationships?.account?.data?.id ||
    attrs?.accountId ||
    attrs?.destinationAccountId ||
    attrs?.account?.id ||
    null
  );
}

function extractAmountKobo(payload: any): number | null {
  const amt = payload?.data?.attributes?.amount;
  return typeof amt === "number" ? amt : null;
}

function extractReference(payload: any): string | null {
  return payload?.data?.attributes?.reference || payload?.data?.id || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const rawBody = await req.text();
  const signature = req.headers.get("x-anchor-signature");

  const validSignature = await verifyAnchorWebhookSignature(rawBody, signature);
  if (!validSignature) {
    console.error("🔴 Anchor webhook signature verification failed - rejecting.");
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventType = extractEventType(payload);
  const eventId = extractEventId(payload);

  if (!eventType || !eventId) {
    console.error("🔴 Anchor webhook missing event type/id - cannot process.", payload);
    return new Response(JSON.stringify({ error: "Missing event type or id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Idempotency: a retried/duplicate delivery of the same event id must not be
  // reprocessed once it has actually succeeded. A delivery that previously failed
  // (processed_at still null) is deliberately reprocessed - every handler below uses
  // conditional updates that are no-ops if already applied, so this is safe.
  const { data: existingEvent } = await supabase
    .from("anchor_webhook_events")
    .select("processed_at")
    .eq("anchor_event_id", eventId)
    .maybeSingle();

  if (existingEvent?.processed_at) {
    console.log(`ℹ️ Duplicate Anchor webhook delivery for event ${eventId} - already processed.`);
    return new Response(JSON.stringify({ ok: true, duplicate: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: upsertError } = await supabase
    .from("anchor_webhook_events")
    .upsert({ anchor_event_id: eventId, event_type: eventType, payload, error: null }, { onConflict: "anchor_event_id" });

  if (upsertError) {
    console.error("🔴 Failed to record Anchor webhook event:", upsertError);
    return new Response(JSON.stringify({ error: "Failed to record event" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    switch (eventType) {
      case "customer.identification.approved": {
        const customerId = extractCustomerId(payload);
        if (customerId) {
          await supabase
            .from("profiles")
            .update({
              kyc_status: "verified",
              kyc_verified_at: new Date().toISOString(),
              seller_status: "approved",
              updated_at: new Date().toISOString(),
            })
            .eq("anchor_customer_id", customerId);
        }
        break;
      }

      case "customer.identification.rejected": {
        const customerId = extractCustomerId(payload);
        const reason = payload?.data?.attributes?.reason || payload?.data?.attributes?.message || null;
        if (customerId) {
          await supabase
            .from("profiles")
            .update({
              kyc_status: "rejected",
              kyc_rejection_reason: reason,
              updated_at: new Date().toISOString(),
            })
            .eq("anchor_customer_id", customerId);
        }
        break;
      }

      case "customer.identification.error": {
        const customerId = extractCustomerId(payload);
        const reason = payload?.data?.attributes?.reason || payload?.data?.attributes?.message || "Verification error - please resubmit.";
        if (customerId) {
          await supabase
            .from("profiles")
            .update({ kyc_rejection_reason: reason, updated_at: new Date().toISOString() })
            .eq("anchor_customer_id", customerId);
        }
        break;
      }

      case "nip.inbound.completed": {
        // Buyer's payment into their order's per-order Sub-Ledger account has cleared.
        const accountId = extractDestinationAccountId(payload);
        const amountKobo = extractAmountKobo(payload);
        if (accountId) {
          let query = supabase
            .from("orders")
            .update({
              status: "paid",
              payment_reference: extractReference(payload) || undefined,
              updated_at: new Date().toISOString(),
            })
            .eq("anchor_sub_account_id", accountId)
            .eq("status", "pending"); // idempotent: only the pending -> paid edge fires escrow creation

          if (amountKobo != null) {
            query = query.eq("total_amount", Math.round(amountKobo / 100));
          }

          const { data: updated, error: updateErr } = await query.select("id");
          if (updateErr) {
            console.error("🔴 Failed to mark order paid from webhook:", updateErr);
          } else if (!updated || updated.length === 0) {
            console.warn(`ℹ️ nip.inbound.completed for account ${accountId} matched no pending order (already processed, or amount mismatch).`);
          }
        }
        break;
      }

      case "nip.inbound.received":
        // Received but not yet cleared - informational only; nip.inbound.completed finalizes it.
        break;

      case "book.transfer.successful":
      case "nip.transfer.successful": {
        const reference = extractReference(payload);
        if (reference) {
          await supabase
            .from("escrow_transactions")
            .update({ anchor_transfer_status: "sent" })
            .or(`release_reference.eq.${reference},reversal_reference.eq.${reference}`);
        }
        break;
      }

      case "book.transfer.failed":
      case "nip.transfer.failed": {
        const reference = extractReference(payload);
        if (reference) {
          await supabase
            .from("escrow_transactions")
            .update({ anchor_transfer_status: "failed" })
            .or(`release_reference.eq.${reference},reversal_reference.eq.${reference}`);
          console.error(`🔴 Anchor transfer failed for reference ${reference} - needs manual reconciliation.`);
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled Anchor webhook event type: ${eventType}`);
    }

    await supabase.from("anchor_webhook_events").update({ processed_at: new Date().toISOString() }).eq("anchor_event_id", eventId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("🔴 Error processing Anchor webhook:", err);
    await supabase.from("anchor_webhook_events").update({ error: err?.message || String(err) }).eq("anchor_event_id", eventId);
    // Return 500 so Anchor retries delivery (AtLeastOnce mode) - our idempotency guard
    // above makes that retry safe.
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
