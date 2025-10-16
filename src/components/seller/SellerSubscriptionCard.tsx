import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SellerRegistrationPayment } from "./SellerRegistrationPayment";
import { CreditCard, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const SellerSubscriptionCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
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
        .select("account_type, seller_subscription_expires_at, seller_features_active, seller_subscription_type")
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
    if (!profile?.seller_subscription_expires_at) return null;
    const expiryDate = new Date(profile.seller_subscription_expires_at);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    
    if (profile.seller_subscription_type === 'daily') {
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      return { hours: diffHours, type: 'hours' };
    } else {
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { days: diffDays, type: 'days' };
    }
  };

  const handleRenewal = async (paymentReference: string) => {
    try {
      const { error } = await supabase.rpc('renew_seller_subscription', {
        p_user_id: user?.id,
        p_payment_reference: paymentReference
      });

      if (error) throw error;

      const renewalPeriod = profile?.seller_subscription_type === 'daily' ? '1 day' : '1 month';
      toast({
        title: "Subscription Renewed!",
        description: `Your seller subscription has been renewed for ${renewalPeriod}.`,
      });

      setShowPayment(false);
      fetchProfile();
    } catch (error) {
      console.error("Error renewing subscription:", error);
      toast({
        title: "Renewal Error",
        description: "Failed to renew subscription. Please contact support.",
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

  // Only show for sellers
  if (!profile || (profile.account_type !== "seller" && profile.account_type !== "both")) {
    return null;
  }

  const timeUntilExpiry = getTimeUntilExpiry();
  const isExpired = !profile.seller_features_active;
  const isExpiringSoon = timeUntilExpiry !== null && (
    (timeUntilExpiry.type === 'hours' && timeUntilExpiry.hours <= 6 && timeUntilExpiry.hours > 0) ||
    (timeUntilExpiry.type === 'days' && timeUntilExpiry.days <= 7 && timeUntilExpiry.days > 0)
  );

  // Don't show if subscription is active and not expiring soon
  if (profile.seller_features_active && !isExpiringSoon) {
    return null;
  }

  if (showPayment) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <SellerRegistrationPayment
          userEmail={user?.email || ""}
          userId={user?.id || ""}
          onPaymentSuccess={handleRenewal}
          onCancel={() => setShowPayment(false)}
        />
      </div>
    );
  }

  return (
    <Card className={`border-2 ${isExpired ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${isExpired ? 'text-red-800' : 'text-orange-800'}`}>
          {isExpired ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <Clock className="h-5 w-5" />
          )}
          {isExpired ? "Seller Subscription Expired" : "Subscription Expiring Soon"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={isExpired ? "destructive" : "outline"} className={isExpired ? "" : "text-orange-700 border-orange-300"}>
            {isExpired ? (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Expired
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                Expires in {timeUntilExpiry?.type === 'hours' ? `${timeUntilExpiry.hours} hours` : `${timeUntilExpiry?.days} days`}
              </>
            )}
          </Badge>
        </div>

        {isExpired ? (
          <div className="space-y-3">
            <p className="text-sm text-red-800">
              <strong>Your seller features have been paused.</strong> Renew your subscription to continue selling and accessing premium features.
            </p>
            <div className="bg-white border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-900 mb-1">Features currently unavailable:</p>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• Creating new product listings</li>
                <li>• Live feed bidding participation</li>
                <li>• Sales dashboard access</li>
                <li>• Marketing tools and promotions</li>
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm text-orange-800">
            <strong>Renew now to avoid interruption.</strong> Your seller subscription expires in {timeUntilExpiry?.type === 'hours' ? `${timeUntilExpiry.hours} hours` : `${timeUntilExpiry?.days} days`}. Renew to continue accessing all premium features.
          </p>
        )}

        <Button
          onClick={() => setShowPayment(true)}
          className="w-full"
          variant={isExpired ? "destructive" : "default"}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Renew Subscription (₦{profile?.seller_subscription_type === 'daily' ? '100 for 1 day' : '2,000 for 1 month'})
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Secure payment powered by Paystack
        </p>
      </CardContent>
    </Card>
  );
};