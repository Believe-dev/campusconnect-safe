import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        .select("account_type, seller_registration_paid, seller_registration_paid_at, seller_approved")
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

  // Only show for sellers who haven't paid registration fee
  if (!profile || profile.account_type !== "seller" || profile.seller_registration_paid) {
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
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertCircle className="h-5 w-5" />
          Complete Seller Registration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-orange-700 border-orange-300">
            <Clock className="h-3 w-3 mr-1" />
            Registration Pending
          </Badge>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-orange-800">
            <strong>Ready to start your campus business?</strong> Pay the one-time ₦100 registration fee and unlock unlimited earning potential.
          </p>
          <div className="bg-gradient-to-r from-green-50 to-orange-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm font-medium text-green-800 mb-1">
              <strong>ROI Calculator:</strong> Sell just 2-3 items and recover your investment
            </p>
            <p className="text-xs text-green-700">
              Example: Sell a ₦1,500 textbook - you keep the full ₦1,500 (no commission)
            </p>
          </div>
        </div>

        <div className="bg-white border border-orange-200 rounded-lg p-3">
          <h4 className="font-medium text-orange-900 mb-2">Unlock Premium Seller Features:</h4>
          <ul className="text-sm text-orange-800 space-y-1">
            <li>• <strong>100% Profit</strong> - Zero commission on all sales</li>
            <li>• <strong>Live Feed Bidding</strong> - Compete for buyer requests in real-time</li>
            <li>• <strong>Secure Payments</strong> - Escrow system protects your money</li>
            <li>• <strong>Smart Communication</strong> - WhatsApp + in-app messaging</li>
            <li>• <strong>Business Analytics</strong> - Track performance & growth</li>
            <li>• <strong>Gamified Selling</strong> - Earn coins, badges & rewards</li>
            <li>• <strong>Marketing Tools</strong> - Boost product visibility</li>
            <li>• <strong>Priority Support</strong> - Get help when you need it</li>
            <li>• <strong>Campus Network</strong> - Access thousands of students</li>
          </ul>
        </div>

        <Button
          onClick={() => setShowPayment(true)}
          className="w-full"
          variant="brand"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Pay Registration Fee (₦100)
        </Button>

        <p className="text-xs text-orange-600 text-center">
          Secure payment powered by Paystack
        </p>
      </CardContent>
    </Card>
  );
};