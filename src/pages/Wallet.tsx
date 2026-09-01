import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  getVirtualAccount,
  fetchCbnKycStatusFromDb,
  AnchorVirtualAccount,
  CbnKycTierDetails,
} from "@/services/anchorBaasService";
import { AnchorWithdrawalModal } from "@/components/wallet/AnchorWithdrawalModal";
import { SellerKycModal } from "@/components/seller/SellerKycModal";
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  Lock,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Clock,
  XCircle,
} from "lucide-react";

interface WalletTransaction {
  id: string;
  amount: number;
  transaction_type: "credit" | "debit";
  description: string;
  created_at: string;
}

// Buyer-facing wallet view. Deliberately narrower than the seller wallet
// dashboard (WalletDashboard.tsx / AnchorVirtualAccountCard.tsx): no NUBAN
// display, no CBN tier badge, no card top-up - buyers only ever land here
// with money in the wallet if a dispute was resolved in their favor
// (reverse_escrow_funds credits wallets directly, see useWalletActivity.tsx).
// The one thing this page used to be missing entirely was a way to actually
// move that money out - "Withdraw to Bank" opens the same unmodified
// AnchorWithdrawalModal the seller dashboard uses.
const Wallet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [account, setAccount] = useState<AnchorVirtualAccount | null>(null);
  const [kycStatus, setKycStatus] = useState<CbnKycTierDetails | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);

  const loadWallet = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [acc, kyc, { data: walletRow }] = await Promise.all([
        getVirtualAccount(user.id),
        fetchCbnKycStatusFromDb(user.id),
        supabase.from("wallets").select("id").eq("user_id", user.id).maybeSingle(),
      ]);
      setAccount(acc);
      setKycStatus(kyc);

      if (walletRow?.id) {
        const { data: txns } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("wallet_id", walletRow.id)
          .order("created_at", { ascending: false })
          .limit(10);

        setTransactions(
          (txns || []).map((t: { id: string; amount: number; type: string; description: string; created_at: string }) => ({
            id: t.id,
            amount: t.amount,
            transaction_type: t.type === "credit" ? ("credit" as const) : ("debit" as const),
            description: t.description,
            created_at: t.created_at,
          })),
        );
      } else {
        setTransactions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const handleWithdrawClick = () => {
    if (kycStatus?.kyc_status !== "verified") {
      toast({
        title: "Identity verification required",
        description: "Verify your identity before withdrawing to your bank account.",
        variant: "destructive",
      });
      setShowKycModal(true);
      return;
    }
    setShowWithdrawalModal(true);
  };

  const kycState = kycStatus?.kyc_status || "unverified";
  const showKycNudge = kycState !== "verified" && (account?.available_balance || 0) > 0;

  const kycNudgeContent = {
    unverified: {
      icon: ShieldAlert,
      title: "Verify your identity to withdraw",
      body: "You have funds available, but withdrawing to a bank account requires a quick BVN/NIN check first.",
      cta: "Verify Identity",
    },
    pending: {
      icon: Clock,
      title: "Verification in progress",
      body: "Your BVN/NIN was submitted and is being reviewed. This is usually quick - check back shortly.",
      cta: "View Status",
    },
    rejected: {
      icon: XCircle,
      title: "Verification failed",
      body: kycStatus?.kyc_rejection_reason || "We couldn't confirm your details. Please check them and resubmit.",
      cta: "Resubmit",
    },
  }[kycState as "unverified" | "pending" | "rejected"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <main className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:py-8 md:pb-8">
          <div className="mb-6 h-8 w-40 animate-pulse rounded-full bg-flora-chip" />
          <div className="h-40 animate-pulse rounded-3xl bg-flora-chip/60" />
          <div className="mt-6 h-56 animate-pulse rounded-3xl bg-flora-chip/60" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:py-8 md:pb-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-flora-ink sm:text-3xl">
            <WalletIcon className="h-6 w-6 text-flora-leaf" />
            Wallet
          </h1>
          <p className="mt-1 text-sm text-flora-muted">Your balance and withdrawal history.</p>
        </div>

        {/* Balance */}
        <div className="rounded-3xl bg-flora-card p-5 shadow-card">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-flora-muted">Available</p>
              <p className="mt-1 text-2xl font-extrabold text-flora-ink">
                ₦{(account?.available_balance || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-0.5 text-[11px] text-flora-muted">Ready to withdraw</p>
            </div>
            <div className="border-l border-flora-ink/10 pl-3">
              <p className="flex items-center gap-1 text-xs font-medium text-flora-muted">
                <Lock className="h-3 w-3" /> Pending
              </p>
              <p className="mt-1 text-2xl font-extrabold text-flora-ink">
                ₦{(account?.pending_balance || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-0.5 text-[11px] text-flora-muted">Still in escrow</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleWithdrawClick}
            disabled={(account?.available_balance || 0) < 100}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-flora-ink py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
            <ArrowUpRight className="h-4 w-4" />
            Withdraw to Bank
          </button>
          {(account?.available_balance || 0) < 100 && (
            <p className="mt-2 text-center text-[11px] text-flora-muted">
              Minimum withdrawal is ₦100.
            </p>
          )}
        </div>

        {/* KYC nudge - only shown to a buyer who actually has money to move */}
        {showKycNudge && kycNudgeContent && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-flora-leaf/30 bg-flora-tagBg/60 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-flora-leaf">
              <kycNudgeContent.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-flora-ink">{kycNudgeContent.title}</p>
              <p className="mt-0.5 text-xs text-flora-muted">{kycNudgeContent.body}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowKycModal(true)}
              className="shrink-0 whitespace-nowrap rounded-full border border-flora-ink/15 bg-white px-3 py-1.5 text-xs font-medium text-flora-ink transition hover:bg-flora-chip">
              {kycNudgeContent.cta}
            </button>
          </div>
        )}

        {/* Transactions */}
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-flora-ink">Recent Transactions</h2>
          {transactions.length === 0 ? (
            <div className="rounded-3xl bg-flora-card p-8 text-center shadow-card">
              <p className="text-sm text-flora-muted">No transactions yet.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-flora-card p-3.5 shadow-card">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        t.transaction_type === "credit"
                          ? "bg-flora-tagBg text-flora-tagText"
                          : "bg-red-50 text-red-600"
                      }`}>
                      {t.transaction_type === "credit" ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-flora-ink">{t.description}</p>
                      <p className="text-xs text-flora-muted">
                        {new Date(t.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-semibold ${
                      t.transaction_type === "credit" ? "text-flora-leaf" : "text-red-600"
                    }`}>
                    {t.transaction_type === "credit" ? "+" : "-"}₦{t.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {account && (
        <AnchorWithdrawalModal
          userId={user?.id || ""}
          account={account}
          open={showWithdrawalModal}
          onClose={() => setShowWithdrawalModal(false)}
          onWithdrawalCompleted={(updated) => {
            setAccount(updated);
            loadWallet();
          }}
        />
      )}

      {user && (
        <SellerKycModal
          userId={user.id}
          open={showKycModal}
          onClose={() => setShowKycModal(false)}
          onKycCompleted={(newKyc) => {
            setKycStatus(newKyc);
          }}
        />
      )}
    </div>
  );
};

export default Wallet;
