// Scheduled job: refreshes the local OFAC SDN sanctions watchlist cache from the
// public, unauthenticated US Treasury Sanctions List Service. Anchor does not perform
// sanctions screening - this is the platform's own responsibility, gating KYC
// verification in anchor-kyc-submit.
//
// Run on a schedule (Supabase dashboard -> Edge Functions -> Schedules, or an external
// cron hitting this URL) - OFAC updates the list frequently and there is no push
// notification for changes, so periodic polling is the only option.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OFAC_BASE = "https://sanctionslistservice.ofac.treas.gov";
// OFAC can rename files without notice; SDN.CSV is the documented current name for the
// full Specially Designated Nationals list. Discovery via /api/sanctions-lists is tried
// first and falls back to this constant if discovery fails.
const FALLBACK_SDN_FILENAME = "SDN.CSV";
const USER_AGENT = "CampusConnect-Sanctions-Sync/1.0 (+support@campusconnect.ng)";

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Minimal CSV line parser tolerant of quoted fields containing commas.
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

async function resolveSdnFilename(): Promise<string> {
  try {
    const res = await fetch(`${OFAC_BASE}/api/sanctions-lists`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (res.ok) {
      const list = await res.json();
      const names: string[] = Array.isArray(list) ? list : list?.data || [];
      const sdnName = names.find((n: string) => /^SDN\.CSV$/i.test(n));
      if (sdnName) return sdnName;
    }
  } catch (err) {
    console.warn("Sanctions list discovery failed, using fallback filename:", err);
  }
  return FALLBACK_SDN_FILENAME;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const filename = await resolveSdnFilename();
    const csvRes = await fetch(`${OFAC_BASE}/api/download/${filename}`, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!csvRes.ok) {
      throw new Error(`OFAC SDN download failed: HTTP ${csvRes.status}`);
    }

    const csvText = await csvRes.text();
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);

    // Classic SDN.CSV has no header row: field[1] is the SDN name.
    const rows = lines
      .map(parseCsvLine)
      .filter((f) => f.length >= 2 && f[1]?.trim())
      .map((f) => ({
        full_name: f[1].trim(),
        normalized_name: normalizeName(f[1]),
        source: "OFAC_SDN",
        list_type: f[2]?.trim() || null,
        synced_at: new Date().toISOString(),
      }))
      .filter((r) => r.normalized_name.length > 0);

    if (rows.length === 0) {
      throw new Error("Parsed 0 rows from OFAC SDN CSV - refusing to wipe existing watchlist.");
    }

    // Full refresh: replace the previous OFAC snapshot with the current one.
    const { error: deleteErr } = await supabase.from("sanctions_watchlist").delete().eq("source", "OFAC_SDN");
    if (deleteErr) throw deleteErr;

    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error: insertErr } = await supabase.from("sanctions_watchlist").insert(batch);
      if (insertErr) throw insertErr;
    }

    console.log(`✅ Sanctions watchlist synced: ${rows.length} OFAC SDN entries.`);
    return new Response(JSON.stringify({ ok: true, synced: rows.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("🔴 Sanctions sync failed:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
