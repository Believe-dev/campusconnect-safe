// Shared Anchor BaaS client for Edge Functions. The Anchor API key lives only in
// Supabase Edge Function secrets (ANCHOR_API_KEY) - it is never sent to the browser.
// Unlike the old client-side client, this deliberately does NOT retry a failed
// sandbox call against the live Anchor URL - sandbox and live are separate, explicit
// configurations (ANCHOR_BASE_URL), not something a 401 should silently escalate into.

export const getAnchorBaseUrl = (): string =>
  Deno.env.get("ANCHOR_BASE_URL") || "https://api.sandbox.getanchor.co/v1";

const getAnchorApiKey = (): string => {
  const key = Deno.env.get("ANCHOR_API_KEY");
  if (!key) {
    throw new Error("ANCHOR_API_KEY is not configured for this Edge Function.");
  }
  return key;
};

export interface AnchorApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export async function anchorApiFetch<T = any>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: any
): Promise<AnchorApiResponse<T>> {
  const url = `${getAnchorBaseUrl()}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-anchor-key": getAnchorApiKey(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (res.ok) {
    return { ok: true, status: res.status, data: json };
  }

  const errMsg =
    json?.errors?.[0]?.detail || json?.errors?.[0]?.title || json?.message || `Anchor API error (HTTP ${res.status})`;
  return { ok: false, status: res.status, data: json, error: errMsg };
}

/**
 * Verifies an Anchor webhook signature per docs.getanchor.co/docs/verify-webhooks:
 * Base64(HMAC_SHA1(requestBody, key = webhook token)).
 * Anchor's own published JS example base64-encodes the *hex* digest rather than the
 * raw MAC bytes, which disagrees with their own formula text - so both encodings are
 * accepted here to avoid spurious rejection due to that ambiguity.
 */
export async function verifyAnchorWebhookSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  const token = Deno.env.get("ANCHOR_WEBHOOK_TOKEN");
  if (!token || !signatureHeader) return false;

  const keyData = new TextEncoder().encode(token);
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const macBytes = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(rawBody)));

  const rawBytesBase64 = btoa(String.fromCharCode(...macBytes));
  const hexDigest = Array.from(macBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hexThenBase64 = btoa(hexDigest);

  return timingSafeEqual(signatureHeader, rawBytesBase64) || timingSafeEqual(signatureHeader, hexThenBase64);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
