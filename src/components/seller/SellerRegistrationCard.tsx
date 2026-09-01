import { useState, useEffect } from "react";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SellerRegistrationPayment } from "./SellerRegistrationPayment";
import { CreditCard, CheckCircle, AlertCircle, Clock } from "lucide-react";

export const SellerRegistrationCard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "account_type, seller_registration_paid, seller_registration_paid_at, seller_approved"
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

  if (loading) {
    return (
      <div className="animate-pulse rounded-3xl bg-white p-6 shadow-card">
        <div className="mb-2 h-4 w-3/4 rounded-full bg-flora-chip" />
        <div className="h-4 w-1/2 rounded-full bg-flora-chip" />
      </div>
    );
  }

  // Only show for sellers who haven't paid registration fee
  if (
    !profile ||
    profile.account_type !== "seller" ||
    profile.seller_registration_paid
  ) {
    return null;
  }

  if (showPayment) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <SellerRegistrationPayment
          userEmail={user?.email || ""}
          userId={user?.id || ""}
          onPaymentSuccess={() => {
            setShowPayment(false);
            fetchProfile(); // Refresh profile data
          }}
          onCancel={() => setShowPayment(false)}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-card">
      <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <AlertCircle className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold text-amber-900">Complete Seller Registration</p>
          <Badge
            variant="outline"
            className="mt-1 border-amber-300 bg-white text-[10px] text-amber-700"
          >
            <Clock className="h-3 w-3 mr-1" />
            Registration Pending
          </Badge>
        </div>
      </div>

      <div className="space-y-4 p-6">
        <div className="space-y-3">
          <p className="text-sm text-flora-ink">
            <strong>Ready to start your campus business?</strong> Pay ₦1000 for your first month's subscription and unlock unlimited earning potential.
          </p>
          <div className="rounded-2xl border border-flora-leaf/30 bg-flora-tagBg/50 p-3.5">
            <p className="text-sm font-medium text-flora-tagText mb-1">
              <strong>ROI Calculator:</strong> Sell just 2-3 items and recover
              your investment
            </p>
            <p className="text-xs text-flora-tagText/80">
              Example: Sell a ₦1,500 textbook - you keep the full ₦1,500 (no
              commission)
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-flora-chip p-3.5">
          <h4 className="font-medium text-flora-ink mb-2">
            Unlock Premium Seller Features:
          </h4>
          <ul className="text-sm text-flora-muted space-y-1">
            <li>
              • <strong className="text-flora-ink">100% Profit</strong> - Zero commission on all sales
            </li>
            <li>
              • <strong className="text-flora-ink">Live Feed Bidding</strong> - Compete for buyer requests
              in real-time
            </li>
            <li>
              • <strong className="text-flora-ink">Secure Payments</strong> - Escrow system protects your
              money
            </li>
            <li>
              • <strong className="text-flora-ink">Smart Communication</strong> - WhatsApp + in-app
              messaging
            </li>
            <li>
              • <strong className="text-flora-ink">Business Analytics</strong> - Track performance & growth
            </li>
            <li>
              • <strong className="text-flora-ink">Gamified Selling</strong> - Earn coins, badges & rewards
            </li>
            <li>
              • <strong className="text-flora-ink">Marketing Tools</strong> - Boost product visibility
            </li>
            <li>
              • <strong className="text-flora-ink">Priority Support</strong> - Get help when you need it
            </li>
            <li>
              • <strong className="text-flora-ink">Campus Network</strong> - Reach students across your campus
            </li>
          </ul>
        </div>

        <Button
          onClick={() => setShowPayment(true)}
          className="w-full"
          variant="brand"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Pay First Month (₦1000)
        </Button>

        <p className="text-xs text-flora-leaf text-center font-medium">
          Secure payment powered by Anchor BaaS (CoreStep Microfinance)
        </p>
      </div>
    </div>
  );
};
