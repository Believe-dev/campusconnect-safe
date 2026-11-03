type SellerSignupPaymentIntent = {
  id: string;
  email: string;
  amount: number | string;
  status: "pending" | "paid" | "claiming" | "claimed" | "expired";
  payment_reference: string;
  claim_token_hash: string;
};

type FlutterwaveTransaction = {
  id?: number | string;
  tx_ref?: string;
  status?: string;
  amount?: number | string;
  currency?: string;
};

export const hashClaimToken = async (token: string): Promise<string> => {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const verifyFlutterwaveTransaction = async (transactionId: string): Promise<FlutterwaveTransaction> => {
  const secretKey = Deno.env.get("FLW_SECRET_KEY");
  if (!secretKey) throw new Error("FLW_SECRET_KEY is not configured.");

  const response = await fetch(
    `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
    { headers: { Authorization: `Bearer ${secretKey}`, Accept: "application/json" } }
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status !== "success" || !payload?.data) {
    throw new Error(payload?.message || "Flutterwave could not verify this transaction.");
  }
  return payload.data as FlutterwaveTransaction;
};

export const verifySellerSignupPayment = async (
  admin: any,
  intent: SellerSignupPaymentIntent,
  transactionId: string,
  claimToken?: string
): Promise<{ verified: boolean; message: string }> => {
  if (claimToken && (await hashClaimToken(claimToken)) !== intent.claim_token_hash) {
    return { verified: false, message: "Invalid seller signup payment session." };
  }
  if (intent.status === "paid" || intent.status === "claiming" || intent.status === "claimed") {
    return { verified: true, message: "Flutterwave payment already verified." };
  }
  if (intent.status !== "pending") return { verified: false, message: "This payment can no longer be used." };

  const transaction = await verifyFlutterwaveTransaction(transactionId);
  const matches =
    transaction.status === "successful" &&
    transaction.tx_ref === intent.payment_reference &&
    transaction.currency === "NGN" &&
    Number(transaction.amount) >= Number(intent.amount);
  if (!matches) return { verified: false, message: "Flutterwave could not confirm the expected registration payment." };

  const { data: updated, error } = await admin
    .from("seller_signup_payment_intents")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("id", intent.id)
    .eq("status", "pending")
    .select("id");
  if (error) throw error;
  if (!updated?.length) return { verified: true, message: "Flutterwave payment already verified." };
  return { verified: true, message: "Flutterwave payment verified." };
};
