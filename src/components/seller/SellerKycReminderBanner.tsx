import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/enhanced-button";
import { fetchCbnKycStatusFromDb, CbnKycTierDetails } from "@/services/anchorBaasService";
import { SellerKycModal } from "@/components/seller/SellerKycModal";
import { ShieldAlert, Clock, XCircle } from "lucide-react";

interface SellerKycReminderBannerProps {
  userId: string;
}

// Persistent nudge for the gap Item 5's real Anchor payment flow made a real,
// reachable state: a seller who has paid (seller_status='pending' or
// 'approved') but never completed BVN/NIN. Not dismissible while unverified -
// closing SellerKycModal doesn't affect this, it reappears on every visit
// until kyc_status is actually 'verified'. Listing is unaffected either way;
// this is specifically about the payout gate (see anchor-withdraw).
export const SellerKycReminderBanner = ({ userId }: SellerKycReminderBannerProps) => {
  const [kycStatus, setKycStatus] = useState<CbnKycTierDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showKycModal, setShowKycModal] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const status = await fetchCbnKycStatusFromDb(userId);
    setKycStatus(status);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (loading || !kycStatus || kycStatus.kyc_status === "verified") {
    return null;
  }

  const state = kycStatus.kyc_status || "unverified";

  const content = {
    unverified: {
      icon: ShieldAlert,
      wrap: "border-amber-500/40 bg-amber-950/30",
      iconWrap: "bg-amber-500/20 text-amber-400",
      title: "Verify your identity to get paid",
      body: "You can list and sell right away. Complete BVN/NIN verification before you request your first payout — funds can't be withdrawn to an unverified account.",
      cta: "Verify Identity",
      showCta: true,
    },
    pending: {
      icon: Clock,
      wrap: "border-blue-500/40 bg-blue-950/30",
      iconWrap: "bg-blue-500/20 text-blue-400",
      title: "Identity verification in progress",
      body: "Your BVN/NIN was submitted to Anchor BaaS and is being reviewed. This is usually quick — check back shortly.",
      cta: "View Status",
      showCta: true,
    },
    rejected: {
      icon: XCircle,
      wrap: "border-red-500/40 bg-red-950/30",
      iconWrap: "bg-red-500/20 text-red-400",
      title: "Identity verification failed",
      body: kycStatus.kyc_rejection_reason || "Anchor couldn't confirm your details. Please check them and resubmit.",
      cta: "Resubmit",
      showCta: true,
    },
  }[state as "unverified" | "pending" | "rejected"];

  if (!content) return null;
  const Icon = content.icon;

  return (
    <>
      <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 ${content.wrap}`}>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${content.iconWrap}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100">{content.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">{content.body}</p>
        </div>
        {content.showCta && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowKycModal(true)}
            className="shrink-0 text-xs border-slate-600 text-slate-200 hover:bg-slate-800"
          >
            {content.cta}
          </Button>
        )}
      </div>

      <SellerKycModal
        userId={userId}
        open={showKycModal}
        onClose={() => setShowKycModal(false)}
        onKycCompleted={() => loadStatus()}
      />
    </>
  );
};
