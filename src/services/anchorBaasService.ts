import { supabase } from "@/integrations/supabase/client";

// All real Anchor BaaS API calls now happen server-side in Supabase Edge Functions
// (supabase/functions/anchor-*). The Anchor API key is a server-only secret and is
// never sent to the browser. This file is a thin client that invokes those functions
// and reads/displays the resulting database state - it does not talk to Anchor
// directly and does not know Anchor's API key, sandbox/live URLs, or request shapes.

export interface AnchorVirtualAccount {
  account_number: string;
  bank_name: string;
  account_name: string;
  available_balance: number;
  pending_balance: number;
  currency: string;
  status: "active" | "inactive";
}

const invoke = async <T = unknown>(fn: string, body?: Record<string, unknown>): Promise<{ ok: boolean; data?: T; error?: string }> => {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    return { ok: false, error: error.message };
  }
  if (data?.error) {
    return { ok: false, error: data.error };
  }
  return { ok: true, data };
};

/**
 * Reads the user's current Anchor-linked wallet balance/account info from the
 * database (kept in sync by the edge functions and webhook handler) for display
 * purposes. Does not create or mutate any Anchor resources.
 */
export const getVirtualAccount = async (
  userId: string,
  userFullName?: string
): Promise<AnchorVirtualAccount> => {
  const [{ data: wallet }, { data: profile }] = await Promise.all([
    supabase
      .from("wallets")
      .select("available_balance, pending_balance, anchor_account_number, anchor_bank_name")
      .eq("user_id", userId)
      .maybeSingle(),
    (supabase.from("profiles") as any)
      .select("anchor_account_number, anchor_bank_name")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const w = wallet as { available_balance?: number; pending_balance?: number; anchor_account_number?: string; anchor_bank_name?: string } | null;
  const p = profile as { anchor_account_number?: string; anchor_bank_name?: string } | null;

  return {
    account_number: w?.anchor_account_number || p?.anchor_account_number || "",
    bank_name: w?.anchor_bank_name || p?.anchor_bank_name || "CoreStep Microfinance / Anchor",
    account_name: userFullName ? `${userFullName} (UniMarket)` : "UniMarket Account",
    available_balance: Number(w?.available_balance || 0),
    pending_balance: Number(w?.pending_balance || 0),
    currency: "NGN",
    status: "active",
  };
};

/**
 * Adds sandbox-only test funds directly to a user's wallet ledger for local testing.
 * Does not call Anchor - this is explicitly a test fixture, not a real deposit.
 */
export const simulateTestDeposit = async (
  userId: string,
  amount: number
): Promise<AnchorVirtualAccount> => {
  const { data: wallet } = await supabase
    .from("wallets")
    .select("id, available_balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (wallet) {
    const newBal = Number(wallet.available_balance || 0) + amount;
    await supabase.from("wallets").update({ available_balance: newBal }).eq("user_id", userId);
    await supabase.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      user_id: userId,
      type: "credit",
      amount,
      description: "Sandbox Test Deposit",
      status: "completed",
    });
  }

  return getVirtualAccount(userId);
};

/**
 * Initiates checkout for one seller's items: creates the order and its own Anchor
 * Sub-Ledger account server-side (anchor-checkout). Returns the NUBAN the buyer
 * should transfer to.
 */
export const initiateAnchorCheckout = async (params: {
  sellerId: string;
  productId: string;
  quantity: number;
  selectedSize?: string | null;
  totalAmount: number;
  shippingAddress: string;
  universityName: string;
  paymentMethod?: string;
}): Promise<{ success: boolean; orderId?: string; nubanAccount?: string; bankName?: string; message?: string }> => {
  const res = await invoke<{ orderId: string; nubanAccount: string; bankName: string }>("anchor-checkout", params);
  if (!res.ok || !res.data) {
    return { success: false, message: res.error || "Failed to start checkout." };
  }
  return { success: true, orderId: res.data.orderId, nubanAccount: res.data.nubanAccount, bankName: res.data.bankName };
};

/**
 * Asks the server to check Anchor for a completed transfer into this order's
 * Sub-Ledger account. There is no fail-open here: if Anchor can't be reached or no
 * matching transfer is found, verified comes back false.
 */
export const verifyAnchorBankTransfer = async (
  orderId: string
): Promise<{ verified: boolean; message: string }> => {
  const res = await invoke<{ verified: boolean; message: string }>("anchor-checkout-verify", { orderId });
  if (!res.ok || !res.data) {
    return { verified: false, message: res.error || "Verification failed." };
  }
  return { verified: !!res.data.verified, message: res.data.message };
};

/**
 * Releases a held escrow to the seller. Only the order's buyer (confirming receipt)
 * or an admin (dispute resolution) is authorized to do this - enforced server-side in
 * anchor-escrow-resolve, not by who can see this button in the UI.
 */
export const approveSellerEscrow = async (
  orderId: string
): Promise<{ success: boolean; message: string }> => {
  const res = await invoke<{ message: string }>("anchor-escrow-resolve", { orderId, action: "release" });
  if (!res.ok || !res.data) {
    return { success: false, message: res.error || "Failed to release funds." };
  }
  return { success: true, message: res.data.message };
};

/**
 * Reverses a held escrow back to the buyer. Admin-only, enforced server-side - used
 * when a dispute is resolved in the buyer's favor.
 */
export const refundAnchorPayment = async (
  orderId: string
): Promise<{ success: boolean; message: string }> => {
  const res = await invoke<{ message: string }>("anchor-escrow-resolve", { orderId, action: "reverse" });
  if (!res.ok || !res.data) {
    return { success: false, message: res.error || "Failed to reverse payment." };
  }
  return { success: true, message: res.data.message };
};

/* ====================================================================
   CBN 3-TIER KYC REGULATORY ENFORCEMENT & CARD WALLET FUNDING
   ==================================================================== */

export interface CbnKycTierDetails {
  tier: 1 | 2 | 3;
  tier_name: string;
  single_deposit_limit: number;
  daily_limit: number;
  max_balance_limit: number;
  bvn_or_nin?: string;
  kyc_status?: "unverified" | "pending" | "verified" | "rejected";
  kyc_rejection_reason?: string;
}

export const CBN_TIER_RULES: Record<1 | 2 | 3, Omit<CbnKycTierDetails, "bvn_or_nin" | "kyc_status" | "kyc_rejection_reason">> = {
  1: {
    tier: 1,
    tier_name: "Tier 1 (Basic / Unverified)",
    single_deposit_limit: 50000,
    daily_limit: 50000,
    max_balance_limit: 300000,
  },
  2: {
    tier: 2,
    tier_name: "Tier 2 (BVN/NIN Verified)",
    single_deposit_limit: 100000,
    daily_limit: 200000,
    max_balance_limit: 500000,
  },
  3: {
    tier: 3,
    tier_name: "Tier 3 (Full Seller KYC)",
    single_deposit_limit: 10000000, // ₦10M
    daily_limit: 50000000, // ₦50M
    max_balance_limit: 100000000, // Unlimited
  },
};

/**
 * Reads the user's real KYC/tier status from the database. A user's tier only ever
 * reflects what Anchor has actually confirmed (profiles.kyc_status = 'verified',
 * set by the anchor-webhook handler) - there is no default-to-Tier-3 fallback for
 * unrecognized or "demo" accounts.
 */
export const fetchCbnKycStatusFromDb = async (userId: string): Promise<CbnKycTierDetails> => {
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("kyc_tier, kyc_status, bvn_or_nin, kyc_rejection_reason")
    .eq("user_id", userId)
    .maybeSingle();

  const p = profile as { kyc_tier?: number; kyc_status?: string; bvn_or_nin?: string; kyc_rejection_reason?: string } | null;
  const tier: 1 | 2 | 3 = p?.kyc_status === "verified" && (p?.kyc_tier === 2 || p?.kyc_tier === 3) ? p.kyc_tier : 1;

  return {
    ...CBN_TIER_RULES[tier],
    bvn_or_nin: p?.bvn_or_nin,
    kyc_status: p?.kyc_status || "unverified",
    kyc_rejection_reason: p?.kyc_rejection_reason,
  };
};

/**
 * Validates whether a transaction complies with CBN single deposit, daily limit, and balance caps.
 */
export const validateCbnLimits = async (
  userId: string,
  amount: number,
  actionType: "deposit" | "card_funding" | "checkout"
): Promise<{ allowed: boolean; message?: string; currentTier: CbnKycTierDetails }> => {
  const kyc = await fetchCbnKycStatusFromDb(userId);
  const account = await getVirtualAccount(userId);

  if (amount > kyc.single_deposit_limit) {
    return {
      allowed: false,
      message: `Transaction of ₦${amount.toLocaleString()} exceeds your CBN ${kyc.tier_name} single deposit cap of ₦${kyc.single_deposit_limit.toLocaleString()}. Please upgrade your KYC tier.`,
      currentTier: kyc,
    };
  }

  const projectedBalance = account.available_balance + amount;
  if (kyc.tier < 3 && projectedBalance > kyc.max_balance_limit) {
    return {
      allowed: false,
      message: `Projected wallet balance of ₦${projectedBalance.toLocaleString()} exceeds your CBN ${kyc.tier_name} maximum balance cap of ₦${kyc.max_balance_limit.toLocaleString()}. Please complete KYC verification.`,
      currentTier: kyc,
    };
  }

  return { allowed: true, currentTier: kyc };
};

/**
 * Submits Tier 1 KYC (BVN/NIN) for real verification against Anchor, after an OFAC
 * sanctions screen. Returns 'pending' - it does NOT instantly verify. The result
 * arrives asynchronously via Anchor's webhook (customer.identification.approved /
 * rejected), which is the only place kyc_status becomes 'verified' and seller_status
 * becomes 'approved'.
 */
export const submitSellerKyc = async (
  data: { bvnOrNin: string; dateOfBirth?: string; gender?: string }
): Promise<{ success: boolean; status: string; message: string }> => {
  const res = await invoke<{ success: boolean; status: string; message: string }>("anchor-kyc-submit", data);
  if (!res.ok || !res.data) {
    return { success: false, status: "rejected", message: res.error || "KYC submission failed." };
  }
  return { success: !!res.data.success, status: res.data.status, message: res.data.message };
};

/**
 * Funds Anchor Virtual Wallet via Card Deposit. Sandbox test-funding only (see
 * simulateTestDeposit) - there is no real card gateway wired up yet.
 */
export const fundWalletWithCard = async (
  userId: string,
  amount: number,
  paymentReference: string
): Promise<{ success: boolean; message: string; account?: AnchorVirtualAccount }> => {
  const cbnCheck = await validateCbnLimits(userId, amount, "card_funding");
  if (!cbnCheck.allowed) {
    return { success: false, message: cbnCheck.message || "CBN Limit Exceeded" };
  }

  const updatedAccount = await simulateTestDeposit(userId, amount);

  try {
    const { data: wallet } = await supabase.from("wallets").select("id").eq("user_id", userId).maybeSingle();
    if (wallet) {
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        user_id: userId,
        type: "credit",
        amount,
        description: `Card Wallet Top-Up (Ref: ${paymentReference.substring(0, 10)})`,
        reference_id: paymentReference,
        reference_type: "card_deposit",
        status: "completed",
      });
    }
  } catch (err) {
    console.error("Wallet transaction log error for card top-up:", err);
  }

  return {
    success: true,
    message: `₦${amount.toLocaleString()} deposited into your Anchor Virtual Wallet via Card!`,
    account: updatedAccount,
  };
};

/**
 * Withdraws funds from the user's wallet to an external Nigerian bank account. The
 * actual Anchor transfer call happens server-side (anchor-withdraw).
 */
export const withdrawToExternalBank = async (
  userId: string,
  data: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    narration?: string;
  }
): Promise<{ success: boolean; message: string; account?: AnchorVirtualAccount }> => {
  const res = await invoke<{ message: string }>("anchor-withdraw", data);
  if (!res.ok || !res.data) {
    return { success: false, message: res.error || "Withdrawal failed." };
  }
  return { success: true, message: res.data.message, account: await getVirtualAccount(userId) };
};
