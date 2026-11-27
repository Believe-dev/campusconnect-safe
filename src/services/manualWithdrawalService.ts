import { supabase } from "@/integrations/supabase/client";
import { getWalletAccount, type WalletAccount } from "@/services/walletAccountService";

export const requestManualWithdrawal = async (
  userId: string,
  data: { bankName: string; accountNumber: string; accountName: string; amount: number }
): Promise<{ success: boolean; message: string; availableForProcessingOn?: string; account?: WalletAccount }> => {
  const { data: response, error } = await supabase.functions.invoke("manual-withdraw", { body: data });
  if (error || response?.error) {
    return { success: false, message: error?.message || response?.error || "Could not submit withdrawal request." };
  }
  return {
    success: true,
    message: response.message,
    availableForProcessingOn: response.availableForProcessingOn,
    account: await getWalletAccount(userId),
  };
};

export const completeManualWithdrawal = async (payoutId: string, transferReference: string, notes?: string) => {
  const { data, error } = await supabase.functions.invoke("manual-withdrawal-complete", {
    body: { payoutId, transferReference, notes },
  });
  if (error || data?.error) return { success: false, message: error?.message || data?.error || "Could not complete withdrawal." };
  return { success: true, message: data.message as string };
};
