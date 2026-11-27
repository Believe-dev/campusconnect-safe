import { supabase } from "@/integrations/supabase/client";

type FunctionResponse<T> = { ok: true; data: T } | { ok: false; message: string };

const invoke = async <T>(name: string, body?: Record<string, unknown>): Promise<FunctionResponse<T>> => {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) return { ok: false, message: error.message };
  if (data?.error) return { ok: false, message: data.error };
  return { ok: true, data: data as T };
};

export type PendingSellerSignup = {
  fullName: string;
  email: string;
  password: string;
  university: string;
  dateOfBirth: string;
  phone: string;
  businessName: string;
  studentId: string;
  bio: string;
  referralCode?: string;
};

export type SellerSignupDraft = {
  signup: Omit<Partial<PendingSellerSignup>, "password">;
  currentStep: number;
  termsAccepted: boolean;
  savedAt: number;
};

type PendingSellerPayment = {
  signup: PendingSellerSignup;
  claimToken: string;
  paymentReference: string;
  savedAt: number;
};

const SELLER_SIGNUP_DRAFT_KEY = "unimarket.sellerSignupDraft.v1";
const PENDING_SELLER_PAYMENT_KEY = "unimarket.pendingSellerSignup.v1";
const LEGACY_PENDING_SELLER_PAYMENT_KEY = "unimarket.pendingSellerSignup";
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PAYMENT_CONTEXT_MAX_AGE_MS = 2 * 60 * 60 * 1000;

const readStoredJson = <T>(key: string): T | null => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
};

/** Keeps an in-progress seller form through refreshes and failed checkouts. */
export const saveSellerSignupDraft = (
  signup: Partial<PendingSellerSignup>,
  currentStep: number,
  termsAccepted: boolean
) => {
  try {
    // A saved form should survive days, but a password must not. The
    // short-lived payment handoff below is kept only long enough to return
    // from Flutterwave and is cleared as soon as the account is activated.
    const { password: _password, ...safeSignup } = signup;
    localStorage.setItem(
      SELLER_SIGNUP_DRAFT_KEY,
      JSON.stringify({ signup: safeSignup, currentStep, termsAccepted, savedAt: Date.now() } satisfies SellerSignupDraft)
    );
  } catch {
    // Storage can be unavailable in private browsing. Signup still works.
  }
};

export const readSellerSignupDraft = (): SellerSignupDraft | null => {
  const draft = readStoredJson<SellerSignupDraft>(SELLER_SIGNUP_DRAFT_KEY);
  if (!draft || !draft.savedAt || Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
    try { localStorage.removeItem(SELLER_SIGNUP_DRAFT_KEY); } catch { /* no-op */ }
    return null;
  }
  return draft;
};

export const clearSellerSignupDraft = () => {
  try { localStorage.removeItem(SELLER_SIGNUP_DRAFT_KEY); } catch { /* no-op */ }
};

/**
 * The Flutterwave handoff normally uses sessionStorage. A short-lived backup
 * in localStorage also survives a page reload or browser restore and is
 * removed as soon as registration succeeds.
 */
export const savePendingSellerPayment = (payment: PendingSellerPayment) => {
  const serialized = JSON.stringify(payment);
  try { sessionStorage.setItem(LEGACY_PENDING_SELLER_PAYMENT_KEY, serialized); } catch { /* no-op */ }
  try { localStorage.setItem(PENDING_SELLER_PAYMENT_KEY, serialized); } catch { /* no-op */ }
};

export const readPendingSellerPayment = (): PendingSellerPayment | null => {
  try {
    const sessionValue = sessionStorage.getItem(LEGACY_PENDING_SELLER_PAYMENT_KEY);
    if (sessionValue) {
      const legacy = JSON.parse(sessionValue) as Partial<PendingSellerPayment>;
      if (legacy.signup && legacy.claimToken) {
        return {
          ...legacy,
          paymentReference: legacy.paymentReference || "",
          savedAt: legacy.savedAt || Date.now(),
        } as PendingSellerPayment;
      }
    }
  } catch {
    // Fall back to the durable copy.
  }

  const pending = readStoredJson<PendingSellerPayment>(PENDING_SELLER_PAYMENT_KEY);
  if (!pending || !pending.savedAt || Date.now() - pending.savedAt > PAYMENT_CONTEXT_MAX_AGE_MS) {
    clearPendingSellerPayment();
    return null;
  }
  return pending;
};

export const clearPendingSellerPayment = () => {
  try { sessionStorage.removeItem(LEGACY_PENDING_SELLER_PAYMENT_KEY); } catch { /* no-op */ }
  try { localStorage.removeItem(PENDING_SELLER_PAYMENT_KEY); } catch { /* no-op */ }
};

/** Starts Flutterwave Standard checkout before creating the seller account. */
export const initiateFlutterwaveSellerRegistration = async (signup: PendingSellerSignup): Promise<{
  success: boolean;
  paymentLink?: string;
  claimToken?: string;
  paymentReference?: string;
  message?: string;
}> => {
  const response = await invoke<{ paymentLink: string; claimToken: string; paymentReference: string }>(
    "flutterwave-seller-registration-init",
    { email: signup.email, fullName: signup.fullName, phone: signup.phone }
  );
  if (!response.ok) return { success: false, message: response.message };
  return {
    success: true,
    paymentLink: response.data.paymentLink,
    claimToken: response.data.claimToken,
    paymentReference: response.data.paymentReference,
  };
};

/**
 * Sends Flutterwave's callback identifiers to the server. The server, not the
 * browser, verifies the payment with Flutterwave before activating the seller.
 */
export const verifyFlutterwaveSellerRegistration = async (
  transactionId: string,
  txRef: string,
  claimToken: string
): Promise<{ verified: boolean; message: string }> => {
  const response = await invoke<{ verified: boolean; message: string }>(
    "flutterwave-seller-registration-verify",
    { transactionId, txRef, claimToken }
  );
  if (!response.ok) return { verified: false, message: response.message };
  return response.data;
};

export const claimFlutterwaveSellerRegistration = async (
  txRef: string,
  claimToken: string
): Promise<{ claimed: boolean; message: string }> => {
  const response = await invoke<{ claimed: boolean; message: string }>(
    "flutterwave-seller-registration-claim",
    { txRef, claimToken }
  );
  if (!response.ok) return { claimed: false, message: response.message };
  return response.data;
};
