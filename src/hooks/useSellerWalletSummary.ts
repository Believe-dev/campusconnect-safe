import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SellerWalletSummary {
  availableBalance: number;
  totalEarnings: number;
  escrowAmount: number;
  escrowCount: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

// Single source of truth for a seller's balance figures. Previously,
// WalletDashboard and AnchorVirtualAccountCard each ran their own
// independent fetch of the same `wallets.available_balance` row - one
// realtime-subscribed, one not - so they could (and did) show two
// different numbers for what is actually the same underlying value.
// Every balance display should consume this hook instead of querying
// `wallets` / `escrow_transactions` directly.
export const useSellerWalletSummary = (): SellerWalletSummary => {
  const [availableBalance, setAvailableBalance] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [escrowAmount, setEscrowAmount] = useState(0);
  const [escrowCount, setEscrowCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [{ data: wallet }, { data: escrow, error: escrowError }] = await Promise.all([
      supabase
        .from("wallets")
        .select("available_balance, total_earnings")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("escrow_transactions")
        .select("seller_amount")
        .eq("seller_id", user.id)
        .eq("status", "held"),
    ]);

    if (!escrowError) {
      setEscrowAmount((escrow || []).reduce((sum, r: any) => sum + Number(r.seller_amount || 0), 0));
      setEscrowCount((escrow || []).length);
    }

    setAvailableBalance(Number(wallet?.available_balance || 0));
    setTotalEarnings(Number(wallet?.total_earnings || 0));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSummary();

    const setupRealTime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`seller-wallet-summary-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "wallets" },
          (payload) => {
            const row = payload.new as any;
            if (row?.user_id === user.id) fetchSummary();
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "escrow_transactions" },
          (payload) => {
            const row = payload.new as any;
            if (row?.seller_id === user.id) fetchSummary();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealTime();
    return () => {
      cleanup.then((fn) => fn && fn());
    };
  }, [fetchSummary]);

  return { availableBalance, totalEarnings, escrowAmount, escrowCount, loading, refetch: fetchSummary };
};
