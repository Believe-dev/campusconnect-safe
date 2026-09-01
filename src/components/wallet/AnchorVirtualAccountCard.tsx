import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/enhanced-button";
import { useToast } from "@/hooks/use-toast";
import {
  getVirtualAccount,
  simulateTestDeposit,
  fundWalletWithCard,
  fetchCbnKycStatusFromDb,
  AnchorVirtualAccount,
  CbnKycTierDetails,
} from "@/services/anchorBaasService";
import { SellerKycModal } from "@/components/seller/SellerKycModal";
import { AnchorWithdrawalModal } from "@/components/wallet/AnchorWithdrawalModal";
import {
  Building2,
  Copy,
  Check,
  Lock,
  Wallet,
  RefreshCw,
  ShieldCheck,
  CreditCard,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";

interface AnchorVirtualAccountCardProps {
  userId: string;
  userFullName?: string;
  onBalanceUpdated?: () => void;
}

export const AnchorVirtualAccountCard = ({
  userId,
  userFullName,
  onBalanceUpdated,
}: AnchorVirtualAccountCardProps) => {
  const [account, setAccount] = useState<AnchorVirtualAccount | null>(null);
  const [kycStatus, setKycStatus] = useState<CbnKycTierDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const { toast } = useToast();

  const loadAccount = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const acc = await getVirtualAccount(userId, userFullName);
      const kyc = await fetchCbnKycStatusFromDb(userId);
      setAccount(acc);
      setKycStatus(kyc);
    } catch (err) {
      console.error("Failed to load Anchor virtual account:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, userFullName]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const handleWithdrawClick = () => {
    if (kycStatus?.kyc_status !== "verified") {
      toast({
        title: "Identity Verification Required",
        description: "Complete BVN/NIN verification before requesting a withdrawal.",
        variant: "destructive",
      });
      setShowKycModal(true);
      return;
    }
    setShowWithdrawalModal(true);
  };

  const handleCopyAccount = () => {
    if (!account) return;
    navigator.clipboard.writeText(account.account_number);
    setCopied(true);
    toast({
      title: "Account Number Copied",
      description: `${account.account_number} copied to clipboard`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestDeposit = async () => {
    if (!userId || depositing) return;
    try {
      setDepositing(true);
      const updated = await simulateTestDeposit(userId, 10000);
      setAccount(updated);
      toast({
        title: "Test NUBAN Deposit Received",
        description: "₦10,000 deposited into your Anchor Virtual Account!",
      });
      if (onBalanceUpdated) onBalanceUpdated();
    } catch (err) {
      console.error("Test deposit failed:", err);
      toast({
        title: "Test Deposit Failed",
        description: "Something went wrong simulating this deposit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDepositing(false);
    }
  };

  const handleCardTopUp = async () => {
    if (!userId || depositing) return;
    const amountStr = prompt("Enter amount to fund via Card (₦):", "5000");
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid deposit amount.",
        variant: "destructive",
      });
      return;
    }

    try {
      setDepositing(true);
      const ref = `CARD_TOPUP_${Date.now()}`;
      const res = await fundWalletWithCard(userId, amount, ref);

      if (res.success) {
        if (res.account) setAccount(res.account);
        toast({
          title: "Card Top-Up Successful! 💳",
          description: res.message,
        });
        if (onBalanceUpdated) onBalanceUpdated();
      } else {
        toast({
          title: "CBN Limit Blocked",
          description: res.message,
          variant: "destructive",
        });
        setShowKycModal(true);
      }
    } catch (err) {
      console.error("Card top-up error:", err);
      toast({
        title: "Card Top-Up Error",
        description: "Something went wrong processing your card payment. Please check your balance before retrying.",
        variant: "destructive",
      });
    } finally {
      setDepositing(false);
    }
  };

  if (loading) {
    return <div className="h-48 animate-pulse rounded-3xl bg-flora-chip/60" />;
  }

  if (!account) return null;

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-flora-card shadow-card">
        <div className="pointer-events-none absolute right-0 top-0 p-3 opacity-[0.06]">
          <Building2 className="h-40 w-40 text-flora-leaf" />
        </div>

        <div className="flex flex-row items-center justify-between gap-3 border-b border-flora-ink/10 p-4 pb-3.5 sm:p-6 sm:pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-flora-tagBg p-2">
              <Building2 className="h-5 w-5 text-flora-leaf" />
            </div>
            <div>
              <p className="flex items-center gap-2 text-base font-bold text-flora-ink">
                Anchor Virtual NUBAN Account
                {kycStatus && (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      kycStatus.tier === 3
                        ? "border-flora-leaf/40 bg-flora-tagBg text-flora-tagText"
                        : kycStatus.tier === 2
                        ? "border-blue-300 bg-blue-50 text-blue-600"
                        : "border-amber-300 bg-amber-50 text-amber-700"
                    }`}
                  >
                    CBN {kycStatus.tier_name}
                  </span>
                )}
              </p>
              <p className="text-xs text-flora-muted">Powered by getanchor.co BaaS Infrastructure</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKycModal(true)}
              className="border-amber-300 text-xs font-bold text-amber-700 hover:bg-amber-50"
            >
              <ShieldAlert className="mr-1 h-3.5 w-3.5" />
              Verify Identity (BVN / NIN) ⚡
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadAccount}
              className="text-flora-muted hover:bg-flora-chip hover:text-flora-ink"
              title="Refresh account"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-4 pt-4 sm:p-6">
          {/* Account Details Box */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl bg-flora-chip p-3.5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-medium text-flora-muted">Virtual Bank &amp; Account Name</p>
              <p className="text-sm font-semibold text-flora-ink">{account.bank_name}</p>
              <p className="text-xs text-flora-muted">{account.account_name}</p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-flora-ink/10 bg-white px-3 py-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-flora-muted">Account Number</p>
                <p className="text-base font-mono font-bold tracking-wider text-flora-leaf">
                  {account.account_number}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyAccount}
                className="h-8 w-8 border-flora-ink/15 text-flora-ink hover:bg-flora-tagBg hover:text-flora-tagText"
              >
                {copied ? <Check className="h-4 w-4 text-flora-leaf" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Balances Display */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-flora-leaf/25 bg-flora-tagBg/40 p-3.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-flora-tagText">
                  <Wallet className="h-3.5 w-3.5" />
                  Available Wallet Balance
                </span>
                <ShieldCheck className="h-3.5 w-3.5 text-flora-leaf" />
              </div>
              <p className="text-xl font-extrabold text-flora-tagText">
                ₦{account.available_balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-0.5 text-[10px] text-flora-tagText/80">Ready for immediate withdrawal</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                  <Lock className="h-3.5 w-3.5" />
                  Locked Escrow Balance
                </span>
                <span className="rounded-full border border-amber-300 bg-white px-1 py-0 text-[9px] text-amber-700">
                  Pending Approval
                </span>
              </div>
              <p className="text-xl font-extrabold text-amber-700">
                ₦{account.pending_balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-0.5 text-[10px] text-amber-700/80">Unlocks when seller approves order</p>
            </div>
          </div>

          {/* Action Controls & Card Top Up */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-flora-ink/10 pt-3 text-xs">
            <span className="text-flora-muted">
              CBN Cap: <strong className="text-flora-ink">₦{kycStatus?.single_deposit_limit.toLocaleString()} / deposit</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleWithdrawClick}
                disabled={account.available_balance < 100}
                className="h-8 rounded-full bg-flora-ink text-xs font-bold text-white hover:brightness-110"
              >
                <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
                Withdraw / Transfer ↗️
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCardTopUp}
                disabled={depositing}
                className="h-8 border-blue-200 bg-blue-50 text-xs text-blue-600 hover:bg-blue-100"
              >
                <CreditCard className="mr-1 h-3.5 w-3.5" />
                Fund with Card 💳
              </Button>
            </div>
          </div>
        </div>
      </div>

      <SellerKycModal
        userId={userId}
        open={showKycModal}
        onClose={() => setShowKycModal(false)}
        onKycCompleted={(newKyc) => {
          setKycStatus(newKyc);
          loadAccount();
        }}
      />

      <AnchorWithdrawalModal
        userId={userId}
        account={account}
        open={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        onWithdrawalCompleted={(updated) => {
          setAccount(updated);
          if (onBalanceUpdated) onBalanceUpdated();
        }}
      />
    </>
  );
};
