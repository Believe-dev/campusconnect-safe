import { useState } from "react";
import { useAnchorPayment } from "@/hooks/useAnchorPayment";
import { AnchorSellerPaymentModal } from "./AnchorSellerPaymentModal";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { BUSINESS_RULES } from "@/lib/constants";
import {
  CreditCard,
  Shield,
  PackageCheck,
  BarChart3,
  Percent,
  Headset,
} from "lucide-react";

interface SellerRegistrationPaymentProps {
  userEmail: string;
  userId: string;
  onPaymentSuccess: (paymentReference: string) => void;
  onCancel: () => void;
  isSubscriptionRenewal?: boolean;
}

interface PendingPayment {
  intentId: string;
  nubanAccount: string;
  bankName?: string;
  amount: number;
}

export const SellerRegistrationPayment = ({
  userEmail,
  userId,
  onPaymentSuccess,
  onCancel,
  isSubscriptionRenewal = false,
}: SellerRegistrationPaymentProps) => {
  const [starting, setStarting] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const { initiatePayment } = useAnchorPayment();
  const { profile } = useProfile();
  const { toast } = useToast();

  const handleStartPayment = async () => {
    setStarting(true);
    try {
      const res = await initiatePayment(isSubscriptionRenewal ? "renewal" : "registration");
      if (!res.success || !res.intentId || !res.nubanAccount) {
        toast({
          title: "Payment Error",
          description: res.message || "Failed to start payment. Please try again.",
          variant: "destructive",
        });
        return;
      }
      setPendingPayment({
        intentId: res.intentId,
        nubanAccount: res.nubanAccount,
        bankName: res.bankName,
        amount: res.amount || (isSubscriptionRenewal ? BUSINESS_RULES.sellerSubscription.monthlyFee : BUSINESS_RULES.sellerRegistration.fee),
      });
    } catch (error) {
      console.error("Payment initiation error:", error);
      toast({
        title: "Payment Error",
        description: "Failed to start payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  };

  const handleVerified = () => {
    setPendingPayment(null);
    toast({
      title: "Payment Successful!",
      description: isSubscriptionRenewal
        ? "Your monthly seller subscription has been renewed for ₦1,000."
        : "Your seller registration fee has been paid. You can now start selling on the platform.",
    });
    onPaymentSuccess(pendingPayment?.intentId || "");
  };

  const fee = isSubscriptionRenewal
    ? BUSINESS_RULES.sellerSubscription.monthlyFee
    : BUSINESS_RULES.sellerRegistration.fee;

  const perks = [
    { icon: PackageCheck, label: "Unlimited listings" },
    { icon: BarChart3, label: "Sales dashboard & analytics" },
    { icon: Percent, label: "Zero commission, always" },
    { icon: Headset, label: "Priority buyer support" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-md">
      {starting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-flora-ink/50">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-flora-card p-6 shadow-floating">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-flora-leaf border-t-transparent" />
            <p className="text-sm font-medium text-flora-ink">Setting up payment...</p>
          </div>
        </div>
      )}

      <div className="rounded-3xl bg-flora-card p-6 shadow-floating">
        <div className="flex items-center gap-2 text-flora-ink">
          <CreditCard className="h-5 w-5 text-flora-leaf" />
          <h2 className="text-lg font-bold">
            {isSubscriptionRenewal ? "Renew subscription" : "Seller registration"}
          </h2>
        </div>

        <div className="mt-4 flex items-baseline justify-between rounded-2xl bg-flora-chip p-4">
          <p className="text-sm text-flora-muted">
            {isSubscriptionRenewal ? "Monthly subscription · 30 days" : "One-time registration fee"}
          </p>
          <p className="text-2xl font-bold text-flora-ink">₦{fee.toLocaleString()}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
          {perks.map(({ icon: Icon, label }, i) => (
            <div key={label} className="flex items-start gap-2">
              <Icon
                className={i % 2 === 0 ? "h-4 w-4 shrink-0 text-flora-leaf" : "h-4 w-4 shrink-0 text-flora-ink"}
                strokeWidth={1.5}
              />
              <span className="text-xs text-flora-ink">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={handleStartPayment}
            disabled={starting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-flora-leafBright to-flora-leaf px-6 py-3.5 text-base font-bold text-white shadow-floating transition hover:brightness-105 disabled:opacity-60"
          >
            {starting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Setting up payment...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Pay ₦{fee.toLocaleString()}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={starting}
            className="w-full rounded-full py-2.5 text-sm font-medium text-flora-muted transition hover:text-flora-ink disabled:opacity-60"
          >
            Cancel
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-flora-muted">
          <Shield className="h-3.5 w-3.5" />
          <p className="text-center text-xs">Secure payment powered by Anchor BaaS</p>
        </div>
      </div>

      {pendingPayment && (
        <AnchorSellerPaymentModal
          isOpen={!!pendingPayment}
          onClose={() => setPendingPayment(null)}
          purpose={isSubscriptionRenewal ? "renewal" : "registration"}
          amount={pendingPayment.amount}
          intentId={pendingPayment.intentId}
          nubanAccount={pendingPayment.nubanAccount}
          bankName={pendingPayment.bankName}
          userName={profile?.full_name || userEmail}
          onVerified={handleVerified}
        />
      )}
    </div>
  );
};
