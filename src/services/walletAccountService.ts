import { supabase } from "@/integrations/supabase/client";

export interface WalletAccount {
  available_balance: number;
  pending_balance: number;
  currency: "NGN";
}

// The platform wallet is an internal ledger. It is funded only by escrow
// releases and refunds; it is not a bank account or a customer deposit account.
export const getWalletAccount = async (userId: string): Promise<WalletAccount> => {
  const { data, error } = await supabase
    .from("wallets")
    .select("available_balance, pending_balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return {
    available_balance: Number(data?.available_balance || 0),
    pending_balance: Number(data?.pending_balance || 0),
    currency: "NGN",
  };
};
