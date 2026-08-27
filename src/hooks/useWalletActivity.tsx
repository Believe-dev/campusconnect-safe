import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateId } from "@/lib/utils";

/**
 * Whether this user has any reason to visit /wallet - a nonzero balance
 * (available or pending) or any transaction history at all. Buyers aren't
 * sellers and historically had no reason to see a wallet link, but
 * reverse_escrow_funds() (dispute resolved in the buyer's favor) credits a
 * buyer's wallet directly - without this, that money would be reachable by
 * URL but not by any navigation link.
 */
export const useWalletActivity = () => {
  const { user } = useAuth();
  const [hasWalletActivity, setHasWalletActivity] = useState(false);
  const [loading, setLoading] = useState(true);
  const instanceId = useRef(generateId()).current;

  useEffect(() => {
    if (!user) {
      setHasWalletActivity(false);
      setLoading(false);
      return;
    }

    fetchWalletActivity();

    const channel = supabase
      .channel(`wallet_activity_${user.id}_${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        () => fetchWalletActivity()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_transactions", filter: `user_id=eq.${user.id}` },
        () => fetchWalletActivity()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchWalletActivity = async () => {
    if (!user) {
      setHasWalletActivity(false);
      setLoading(false);
      return;
    }

    try {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("available_balance, pending_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      const hasBalance =
        !!wallet && (Number(wallet.available_balance || 0) > 0 || Number(wallet.pending_balance || 0) > 0);

      if (hasBalance) {
        setHasWalletActivity(true);
        return;
      }

      const { data: transactions } = await supabase
        .from("wallet_transactions")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      setHasWalletActivity(!!transactions && transactions.length > 0);
    } catch (error) {
      setHasWalletActivity(false);
    } finally {
      setLoading(false);
    }
  };

  return { hasWalletActivity, loading, refetch: fetchWalletActivity };
};
