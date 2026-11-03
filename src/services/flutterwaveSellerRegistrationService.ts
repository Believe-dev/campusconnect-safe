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

/** Starts Flutterwave Standard checkout before creating the seller account. */
export const initiateFlutterwaveSellerRegistration = async (signup: PendingSellerSignup): Promise<{
  success: boolean;
  paymentLink?: string;
  claimToken?: string;
  message?: string;
}> => {
  const response = await invoke<{ paymentLink: string; claimToken: string }>(
    "flutterwave-seller-registration-init",
    { email: signup.email, fullName: signup.fullName, phone: signup.phone }
  );
  if (!response.ok) return { success: false, message: response.message };
  return { success: true, paymentLink: response.data.paymentLink, claimToken: response.data.claimToken };
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
