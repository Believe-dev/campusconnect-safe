import { supabase } from "@/integrations/supabase/client";

type FunctionResponse<T> = { ok: true; data: T } | { ok: false; message: string };

const invoke = async <T>(name: string, body?: Record<string, unknown>): Promise<FunctionResponse<T>> => {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) return { ok: false, message: error.message };
  if (data?.error) return { ok: false, message: data.error };
  return { ok: true, data: data as T };
};

export const initiateFlutterwaveSellerMembershipPayment = async (): Promise<{
  success: boolean;
  paymentLink?: string;
  paymentReference?: string;
  amount?: number;
  purpose?: "registration" | "renewal";
  message?: string;
}> => {
  const response = await invoke<{
    paymentLink: string;
    paymentReference: string;
    amount: number;
    purpose: "registration" | "renewal";
  }>("flutterwave-seller-membership-init");
  if (!response.ok) return { success: false, message: response.message };
  return { success: true, ...response.data };
};

export const verifyFlutterwaveSellerMembershipPayment = async (
  transactionId: string,
  txRef: string
): Promise<{ verified: boolean; completed: boolean; message: string }> => {
  const response = await invoke<{ verified: boolean; completed: boolean; message: string }>(
    "flutterwave-seller-membership-verify",
    { transactionId, txRef }
  );
  if (!response.ok) return { verified: false, completed: false, message: response.message };
  return response.data;
};
