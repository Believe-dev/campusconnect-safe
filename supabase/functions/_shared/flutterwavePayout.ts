type FlutterwaveResponse<T> = { status?: string; message?: string; data?: T };

const flutterwaveFetch = async <T>(path: string, method: "GET" | "POST", body?: Record<string, unknown>) => {
  const secretKey = Deno.env.get("FLW_SECRET_KEY");
  if (!secretKey) throw new Error("FLW_SECRET_KEY is not configured.");
  const response = await fetch(`https://api.flutterwave.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${secretKey}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => null) as FlutterwaveResponse<T> | null;
  return { ok: response.ok && payload?.status === "success", status: response.status, payload };
};

export const resolveFlutterwaveBankAccount = async (accountNumber: string, bankCode: string) => {
  const result = await flutterwaveFetch<{ account_name?: string; account_number?: string }>("/v3/accounts/resolve", "POST", {
    account_number: accountNumber,
    account_bank: bankCode,
  });
  const accountName = result.payload?.data?.account_name;
  if (!result.ok || !accountName) throw new Error(result.payload?.message || "Flutterwave could not resolve this bank account.");
  return { accountName, accountNumber: result.payload?.data?.account_number || accountNumber };
};

export const initiateFlutterwaveTransfer = async (input: {
  accountNumber: string;
  bankCode: string;
  amount: number;
  narration: string;
  reference: string;
  callbackUrl?: string;
}) => flutterwaveFetch<{ id?: number | string; status?: string; complete_message?: string }>("/v3/transfers", "POST", {
  account_bank: input.bankCode,
  account_number: input.accountNumber,
  amount: input.amount,
  currency: "NGN",
  debit_currency: "NGN",
  narration: input.narration,
  reference: input.reference,
  ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
});

export const getFlutterwaveTransfer = async (transferId: string) =>
  flutterwaveFetch<{ id?: number | string; reference?: string; status?: string; complete_message?: string }>(
    `/v3/transfers/${encodeURIComponent(transferId)}`,
    "GET",
  );

export const processFlutterwavePayoutWebhook = async (admin: any, payload: any): Promise<boolean> => {
  const eventType = typeof payload?.event === "string" ? payload.event : "unknown";
  const reference = payload?.data?.reference;
  const transferId = payload?.data?.id;
  const transferStatus = typeof payload?.data?.status === "string" ? payload.data.status.toUpperCase() : "UNKNOWN";
  if (typeof reference !== "string" || !reference.startsWith("FLW_PAYOUT_")) return false;

  const eventKey = `payout:${eventType}:${transferId ?? reference}:${transferStatus}`;
  const { data: existing, error: existingError } = await admin.from("flutterwave_webhook_events")
    .select("id, processed_at").eq("event_key", eventKey).maybeSingle();
  if (existingError) throw existingError;
  if (existing?.processed_at) return true;

  const { data: event, error: eventError } = await admin.from("flutterwave_webhook_events")
    .upsert({ event_key: eventKey, event_type: eventType, payload, error: null }, { onConflict: "event_key" })
    .select("id").single();
  if (eventError || !event) throw eventError || new Error("Failed to record Flutterwave payout event.");

  const { data: payout, error: payoutError } = await admin.from("payout_requests")
    .select("id").eq("provider_reference", reference).eq("payout_provider", "flutterwave").maybeSingle();
  if (payoutError) throw payoutError;
  if (payout && eventType === "transfer.completed") {
    if (typeof transferId !== "string" && typeof transferId !== "number") {
      throw new Error("Flutterwave payout webhook did not include a transfer ID.");
    }

    // A signed webhook proves its origin; fetching the transfer again proves
    // that its final reference and state still match our own payout record.
    const verifiedTransfer = await getFlutterwaveTransfer(String(transferId));
    if (!verifiedTransfer.ok || verifiedTransfer.payload?.data?.reference !== reference) {
      throw new Error("Flutterwave payout transfer verification failed.");
    }
    const verifiedStatus = verifiedTransfer.payload.data.status?.toUpperCase();
    const successful = verifiedStatus === "SUCCESSFUL";
    const failed = verifiedStatus === "FAILED";
    if (successful || failed) {
      const { error: settleError } = await admin.rpc("settle_flutterwave_payout", {
        p_payout_id: payout.id,
        p_provider_transfer_id: String(verifiedTransfer.payload.data.id ?? transferId),
        p_success: successful,
        p_note: verifiedTransfer.payload.data.complete_message || payload?.data?.complete_message || null,
      });
      if (settleError) throw settleError;
    }
  }

  const { error: processedError } = await admin.from("flutterwave_webhook_events")
    .update({ processed_at: new Date().toISOString(), error: null }).eq("id", event.id);
  if (processedError) throw processedError;
  return true;
};
