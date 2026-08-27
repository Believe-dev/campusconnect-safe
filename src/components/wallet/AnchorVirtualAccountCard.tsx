import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
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
  PlusCircle,
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
    return (
      <Card className="animate-pulse bg-gradient-to-r from-emerald-950 to-slate-900 text-white border-emerald-800">
        <CardContent className="p-6 h-48" />
      </Card>
    );
  }

  if (!account) return null;

  return (
    <>
      <Card className="overflow-hidden border-2 border-emerald-500/30 bg-slate-900 text-white shadow-xl relative">
        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
          <Building2 className="w-40 h-40 text-emerald-400" />
        </div>

        <CardHeader className="pb-2 border-b border-slate-800 flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/40">
              <Building2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                Anchor Virtual NUBAN Account
                {kycStatus && (
                  <Badge
                    variant="outline"
                    className={
                      kycStatus.tier === 3
                        ? "bg-emerald-950 text-emerald-300 border-emerald-500 text-[10px]"
                        : kycStatus.tier === 2
                        ? "bg-blue-950 text-blue-300 border-blue-500 text-[10px]"
                        : "bg-amber-950 text-amber-300 border-amber-500 text-[10px]"
                    }
                  >
                    CBN {kycStatus.tier_name}
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-slate-400">Powered by getanchor.co BaaS Infrastructure</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKycModal(true)}
              className="text-xs border-amber-500/50 text-amber-300 hover:bg-amber-950 font-bold"
            >
              <ShieldAlert className="h-3.5 w-3.5 mr-1" />
              Verify Identity (BVN / NIN) ⚡
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadAccount}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
              title="Refresh account"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Account Details Box */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-400 font-medium">Virtual Bank & Account Name</p>
              <p className="text-sm font-semibold text-slate-200">{account.bank_name}</p>
              <p className="text-xs text-slate-400">{account.account_name}</p>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-700">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Account Number</p>
                <p className="text-base font-mono font-bold text-emerald-400 tracking-wider">
                  {account.account_number}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyAccount}
                className="h-8 w-8 text-slate-300 border-slate-700 hover:bg-emerald-950 hover:text-emerald-300"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Balances Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-800/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-emerald-300 font-medium flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                  Available Wallet Balance
                </span>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-xl font-extrabold text-emerald-300">
                ₦{account.available_balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-emerald-400/80 mt-0.5">Ready for immediate withdrawal</p>
            </div>

            <div className="bg-amber-950/30 p-3.5 rounded-xl border border-amber-800/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-amber-300 font-medium flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  Locked Escrow Balance
                </span>
                <Badge variant="outline" className="bg-amber-950 text-amber-300 border-amber-600 text-[9px] px-1 py-0">
                  Pending Approval
                </Badge>
              </div>
              <p className="text-xl font-extrabold text-amber-300">
                ₦{account.pending_balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-amber-400/80 mt-0.5">Unlocks when seller approves order</p>
            </div>
          </div>

          {/* Action Controls & Card Top Up */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800 text-xs">
            <span className="text-slate-400">
              CBN Cap: <strong className="text-slate-200">₦{kycStatus?.single_deposit_limit.toLocaleString()} / deposit</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleWithdrawClick}
                disabled={account.available_balance < 100}
                className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs h-8"
              >
                <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                Withdraw / Transfer ↗️
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCardTopUp}
                disabled={depositing}
                className="bg-blue-950/80 text-blue-300 border-blue-700 hover:bg-blue-900 hover:text-white text-xs h-8"
              >
                <CreditCard className="h-3.5 w-3.5 mr-1" />
                Fund with Card 💳
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
