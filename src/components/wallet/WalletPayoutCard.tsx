import { useEffect, useState } from "react";
import { ArrowUpRight, Building2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/enhanced-button";
import { useToast } from "@/hooks/use-toast";
import { SellerKycModal } from "@/components/seller/SellerKycModal";
import { ManualWithdrawalModal } from "@/components/wallet/ManualWithdrawalModal";
import { fetchCbnKycStatusFromDb, type CbnKycTierDetails } from "@/services/anchorBaasService";
import { getWalletAccount, type WalletAccount } from "@/services/walletAccountService";
import { useSellerWalletSummary } from "@/hooks/useSellerWalletSummary";

interface WalletPayoutCardProps {
  userId: string;
  onBalanceUpdated?: () => void;
}

export const WalletPayoutCard = ({ userId, onBalanceUpdated }: WalletPayoutCardProps) => {
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [kycStatus, setKycStatus] = useState<CbnKycTierDetails | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const { availableBalance } = useSellerWalletSummary();
  const { toast } = useToast();

  const refresh = async () => {
    const [wallet, kyc] = await Promise.all([getWalletAccount(userId), fetchCbnKycStatusFromDb(userId)]);
    setAccount(wallet);
    setKycStatus(kyc);
  };

  useEffect(() => {
    void refresh();
  }, [userId]);

  const openWithdrawal = () => {
    if (kycStatus?.kyc_status !== "verified") {
      toast({
        title: "Identity verification required",
        description: "Complete BVN/NIN verification before requesting a withdrawal.",
        variant: "destructive",
      });
      setShowKycModal(true);
      return;
    }
    setShowWithdrawalModal(true);
  };

  if (!account) return <div className="h-36 animate-pulse rounded-3xl bg-flora-chip/60" />;

  return (
    <>
      <section className="rounded-3xl bg-flora-card p-4 shadow-card sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-flora-tagBg p-2 text-flora-leaf"><Building2 className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-flora-ink">Withdraw earnings</h3>
            <p className="mt-0.5 text-xs text-flora-muted">Manual bank withdrawals are processed within 3 business days.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-flora-ink/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-flora-ink">Available: <strong>₦{availableBalance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</strong></p>
          <Button type="button" onClick={openWithdrawal} disabled={availableBalance < 100} className="rounded-full bg-flora-ink text-xs text-white hover:brightness-110">
            <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" /> Withdraw to bank
          </Button>
        </div>
        {kycStatus?.kyc_status !== "verified" && (
          <button type="button" onClick={() => setShowKycModal(true)} className="mt-3 flex w-full items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-left text-xs text-amber-800 hover:bg-amber-100">
            <ShieldAlert className="h-4 w-4 shrink-0" /> Verify your identity before withdrawing.
          </button>
        )}
      </section>

      <SellerKycModal userId={userId} open={showKycModal} onClose={() => setShowKycModal(false)} onKycCompleted={(kyc) => { setKycStatus(kyc); void refresh(); }} />
      <ManualWithdrawalModal
        userId={userId}
        account={{ ...account, available_balance: availableBalance }}
        open={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        onWithdrawalCompleted={(updated) => { setAccount(updated); onBalanceUpdated?.(); }}
      />
    </>
  );
};
