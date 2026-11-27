import { supabase } from "@/integrations/supabase/client";
import { getWalletAccount, type WalletAccount } from "@/services/walletAccountService";

const invoke = async <T>(name: string, body?: Record<string, unknown>): Promise<{ data?: T; error?: string }> => {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { data: data as T };
};

export const resolveFlutterwavePayoutAccount = async (bankCode: string, accountNumber: string) => {
  const result = await invoke<{ accountName: string; accountNumber: string }>("flutterwave-bank-account-resolve", { bankCode, accountNumber });
  return result.data ? { success: true, ...result.data } : { success: false, message: result.error || "Could not resolve this bank account." };
};

export const withdrawWithFlutterwave = async (
  userId: string,
  data: { bankName: string; bankCode: string; accountNumber: string; amount: number; narration?: string }
): Promise<{ success: boolean; pending?: boolean; message: string; account?: WalletAccount }> => {
  const result = await invoke<{ success: boolean; pending?: boolean; message: string }>("flutterwave-withdraw", data);
  if (!result.data?.success) return { success: false, message: result.error || result.data?.message || "Withdrawal failed." };
  return { success: true, pending: result.data.pending, message: result.data.message, account: await getWalletAccount(userId) };
};
