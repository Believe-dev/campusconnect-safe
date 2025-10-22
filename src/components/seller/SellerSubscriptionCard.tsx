import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SellerRegistrationPayment } from "./SellerRegistrationPayment";
import { CreditCard, AlertTriangle, Clock, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FIRST_TIME_SELLER_WARNING_KEY = "unimarket:firstTimeSellerWarningShown";

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

  const getTimeUntilExpiry = () => {
    // For now, return null since subscription columns don't exist yet
    return null;
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
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
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

  // For now, show subscription card for all sellers since migration hasn't been run
  const timeUntilExpiry = getTimeUntilExpiry();
  const isExpired = false; // Default to not expired until migration is run
  const isExpiringSoon = false;

  if (showPayment) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
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
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <CreditCard className="h-5 w-5" />
          Monthly Seller Subscription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-700 border-blue-300">
            <CreditCard className="h-3 w-3 mr-1" />
            Subscription Available
          </Badge>
        </div>

        {showFirstTimeWarning && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 relative">
            <button
              onClick={dismissFirstTimeWarning}
              className="absolute top-2 right-2 text-orange-400 hover:text-orange-600"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-800 mb-1">
                  ⚠️ First-time sellers - READ THIS!
                </p>
                <p className="text-sm text-orange-700">
                  <strong>
                    Don't pay this if you are a first-time user and you already
                    paid the registration fee.
                  </strong>{" "}
                  The registration fee covers your first month. This
                  subscription is only for renewals after your first month
                  expires. This payment modal be removed soon...
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm text-blue-800">
            <strong>Upgrade to Monthly Subscription!</strong> Get premium seller
            features for just ₦1,000 per month.
          </p>
          <div className="bg-white border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-medium text-blue-900 mb-1">
              Premium features included:
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Unlimited product listings</li>
              <li>• Live feed bidding participation</li>
              <li>• Advanced sales dashboard</li>
              <li>• Marketing tools and promotions</li>
              <li>• Priority customer support</li>
            </ul>
          </div>
        </div>

        <Button
          onClick={() => setShowPayment(true)}
          className="w-full"
          variant="default"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Subscribe Now (₦1,000/month)
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Secure payment powered by Paystack
        </p>
      </CardContent>
    </Card>
  );
};
