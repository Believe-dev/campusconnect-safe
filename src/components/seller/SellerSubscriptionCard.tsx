import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SellerRegistrationPayment } from "./SellerRegistrationPayment";
import { CreditCard, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FIRST_TIME_SELLER_WARNING_KEY = "unimarket:firstTimeSellerWarningShown";

const PREMIUM_FEATURES = [
  "Unlimited product listings",
  "Live feed bidding participation",
  "Advanced sales dashboard",
  "Marketing tools and promotions",
  "Priority customer support",
];

export const SellerSubscriptionCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFirstTimeWarning, setShowFirstTimeWarning] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      // Check if first-time seller warning should be shown
      const warningShown = localStorage.getItem(FIRST_TIME_SELLER_WARNING_KEY);
      setShowFirstTimeWarning(warningShown !== "1");
    }
  }, [user]);

  const dismissFirstTimeWarning = () => {
    localStorage.setItem(FIRST_TIME_SELLER_WARNING_KEY, "1");
    setShowFirstTimeWarning(false);
  };

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "account_type, seller_status, seller_subscription_expires_at, seller_features_active"
        )
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewal = async (paymentReference: string) => {
    try {
      // For now, just show success message since RPC function doesn't exist yet
      toast({
        title: "Payment Successful!",
        description: "Your subscription payment has been processed. ",
      });

      setShowPayment(false);
      fetchProfile();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Payment Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse rounded-3xl bg-white p-6 shadow-card">
        <div className="mb-2 h-4 w-3/4 rounded-full bg-flora-chip" />
        <div className="h-4 w-1/2 rounded-full bg-flora-chip" />
      </div>
    );
  }

  // Only show for sellers without active subscription
  if (
    !profile ||
    (profile.account_type !== "seller" && profile.account_type !== "both")
  ) {
    return null;
  }

  // Hide if user has active subscription
  const hasActiveSubscription =
    profile.seller_subscription_expires_at &&
    new Date(profile.seller_subscription_expires_at) > new Date() &&
    profile.seller_features_active;

  if (hasActiveSubscription) {
    return null;
  }

  if (showPayment) {
    return (
      <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-flora-ink/60 p-4 fade-in duration-200">
        <div className="w-full animate-in slide-in-from-bottom-4 duration-300">
          <SellerRegistrationPayment
            userEmail={user?.email || ""}
            userId={user?.id || ""}
            onPaymentSuccess={handleRenewal}
            onCancel={() => setShowPayment(false)}
            isSubscriptionRenewal={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-card">
      <div className="flex items-center gap-3 bg-flora-ink px-6 py-4 text-white">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <CreditCard className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold">Monthly Seller Subscription</p>
          <p className="text-xs text-white/70">₦1,000/month · Subscription available</p>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {showFirstTimeWarning && (
          <div className="relative rounded-2xl bg-amber-50 p-4">
            <button
              type="button"
              aria-label="Dismiss"
              onClick={dismissFirstTimeWarning}
              className="absolute right-3 top-3 text-amber-500 transition hover:text-amber-700"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="pr-6 text-sm font-semibold text-amber-800">
              First-time sellers — read this first
            </p>
            <p className="mt-1 text-sm text-amber-700">
              <strong>Don't pay this if you're a first-time seller who already paid the registration fee</strong> — that fee covers your first month. This subscription is only for renewals after your first month expires.
            </p>
          </div>
        )}

        <div className="rounded-2xl bg-flora-chip p-4">
          <p className="text-sm font-semibold text-flora-ink">Premium features included</p>
          <ul className="mt-2 space-y-1.5">
            {PREMIUM_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-flora-muted">
                <Check className="h-3.5 w-3.5 shrink-0 text-flora-leaf" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => setShowPayment(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-flora-ink px-4 py-3 text-sm font-medium text-white transition hover:brightness-110"
        >
          <CreditCard className="h-4 w-4" />
          Subscribe Now (₦1,000/month)
        </button>

        <p className="text-center text-xs text-flora-muted">
          Secure payment powered by Paystack
        </p>
      </div>
    </div>
  );
};
