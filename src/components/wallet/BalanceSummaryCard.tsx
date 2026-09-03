import { DollarSign, Lock, TrendingUp, ArrowRight } from "lucide-react";
import { useSellerWalletSummary } from "@/hooks/useSellerWalletSummary";
import type { CbnKycTierDetails } from "@/services/anchorBaasService";

interface BalanceSummaryCardProps {
  kycStatus: CbnKycTierDetails | null;
  onVerifyClick?: () => void;
}

// The one canonical place a seller's money is shown - reused verbatim on
// the Overview tab and the Earnings tab so there is exactly one figure to
// keep straight, not two components independently rendering the same
// underlying `wallets` row.
export const BalanceSummaryCard = ({ kycStatus, onVerifyClick }: BalanceSummaryCardProps) => {
  const { availableBalance, totalEarnings, escrowAmount, escrowCount, loading } =
    useSellerWalletSummary();
  const needsVerification = kycStatus?.kyc_status !== "verified";

  if (loading) {
    return <div className="h-40 animate-pulse rounded-3xl bg-flora-chip/60" />;
  }

  return (
    <div>
      <div className="overflow-hidden rounded-3xl bg-flora-card shadow-card">
        <div className="bg-gradient-to-br from-flora-leafBright to-flora-leaf p-4 text-white sm:p-6">
          <div className="flex items-center gap-2 text-white/90">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium sm:text-sm">Available to withdraw</span>
          </div>
          <div className="mt-1 text-2xl font-extrabold sm:mt-2 sm:text-3xl">
            ₦{availableBalance.toLocaleString()}
          </div>
          <p className="mt-0.5 text-[11px] text-white/85 sm:text-xs">
            Confirmed &amp; ready — you can withdraw this now
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-flora-ink/10">
          <div className="p-3.5 sm:p-4">
            <span className="flex items-center gap-1.5 text-[11px] text-flora-muted sm:text-xs">
              <Lock className="h-3.5 w-3.5" />
              In escrow
            </span>
            <p className="mt-1 text-sm font-bold text-flora-ink sm:text-base">
              ₦{escrowAmount.toLocaleString()}
            </p>
          </div>
          <div className="p-3.5 sm:p-4">
            <span className="flex items-center gap-1.5 text-[11px] text-flora-muted sm:text-xs">
              <TrendingUp className="h-3.5 w-3.5" />
              Lifetime earned
            </span>
            <p className="mt-1 text-sm font-bold text-flora-ink sm:text-base">
              ₦{totalEarnings.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {needsVerification && escrowCount > 0 && (
        <button
          type="button"
          onClick={onVerifyClick}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100"
        >
          <Lock className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="flex-1 text-sm text-amber-800">
            ₦{escrowAmount.toLocaleString()} across {escrowCount} order{escrowCount !== 1 ? "s" : ""}{" "}
            can't be withdrawn until you verify your identity.
          </span>
          {onVerifyClick && <ArrowRight className="h-4 w-4 shrink-0 text-amber-600" />}
        </button>
      )}
    </div>
  );
};

export default BalanceSummaryCard;
