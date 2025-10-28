import { useState } from "react";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePaystack } from "@/hooks/usePaystack";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BUSINESS_RULES } from "@/lib/constants";
import { CreditCard, Shield, CheckCircle } from "lucide-react";

interface SellerRegistrationPaymentProps {
  userEmail: string;
  userId: string;
  onPaymentSuccess: (paymentReference: string) => void;
  onCancel: () => void;
  isSubscriptionRenewal?: boolean;
}

export const SellerRegistrationPayment = ({
  userEmail,
  userId,
  onPaymentSuccess,
  onCancel,
  isSubscriptionRenewal = false,
}: SellerRegistrationPaymentProps) => {
  const [processing, setProcessing] = useState(false);
  const { initializePayment } = usePaystack();
  const { toast } = useToast();

  const handlePayment = async () => {
    setProcessing(true);

    try {
      // Get email from auth if not provided
      let email = userEmail;
      if (!email) {
        const { data: { user } } = await supabase.auth.getUser();
        email = user?.email || '';
      }

      if (!email) {
        throw new Error('Email is required for payment');
      }

      const amount = isSubscriptionRenewal 
        ? BUSINESS_RULES.sellerSubscription.monthlyFee * 100 
        : BUSINESS_RULES.sellerRegistration.fee * 100; // Convert to kobo
      const paymentRef = isSubscriptionRenewal 
        ? `SELLER_SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        : `SELLER_REG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Close the modal after initializing payment to avoid z-index conflicts
      setTimeout(() => onCancel(), 100);

      initializePayment({
        email: email,
        amount,
        currency: "NGN",
        ref: paymentRef,
        onSuccess: async (response) => {
          try {
            if (isSubscriptionRenewal) {
              // Get current user ID from auth
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              if (!currentUser) throw new Error('User not authenticated');
              
              // Use database function to activate subscription
              const { error: subscriptionError } = await supabase.rpc('create_seller_subscription', {
                p_user_id: currentUser.id,
                p_subscription_type: 'monthly',
                p_payment_reference: response.reference,
                p_amount: 1000.00
              });

              if (subscriptionError) {
                console.error('Subscription activation error:', subscriptionError);
                throw subscriptionError;
              }
              
              // Handle subscription renewal
              toast({
                title: "Payment Successful!",
                description: "Your monthly seller subscription has been renewed for ₦1,000.",
              });
              onPaymentSuccess(response.reference);
            } else {
              // Handle registration payment
              const { error: paymentError } = await supabase
                .from("seller_registration_payments")
                .insert({
                  user_id: userId,
                  amount: BUSINESS_RULES.sellerRegistration.fee,
                  payment_reference: response.reference,
                  payment_method: "paystack",
                  status: "completed",
                });

              if (paymentError) {
                console.error("Error recording payment:", paymentError);
                throw paymentError;
              }

              const { error: profileError } = await supabase
                .from("profiles")
                .update({
                  seller_registration_paid: true,
                  seller_registration_paid_at: new Date().toISOString(),
                  account_type: "seller",
                  seller_status: "pending"
                })
                .eq("user_id", userId);

              if (profileError) {
                console.error("Error updating profile:", profileError);
                throw profileError;
              }

              toast({
                title: "Payment Successful!",
                description: "Your seller registration fee has been paid. You can now start selling on the platform.",
              });

              onPaymentSuccess(response.reference);
            }
          } catch (error) {
            console.error("Error processing payment success:", error);
            toast({
              title: "Payment Processing Error",
              description: "Payment was successful but there was an error updating your account. Please contact support.",
              variant: "destructive",
            });
          }
        },
        onClose: () => {
          setProcessing(false);
        },
      });
    } catch (error) {
      console.error("Payment initialization error:", error);
      toast({
        title: "Payment Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  return (
    <div className="w-full relative">
      {processing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-sm font-medium text-gray-700">Loading payment...</p>
          </div>
        </div>
      )}
      <Card className="border-0 shadow-2xl bg-white">
        <CardHeader className="text-center pb-4 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="flex items-center justify-center gap-2 text-lg text-gray-900">
            <CreditCard className="h-5 w-5 text-blue-600" />
            {isSubscriptionRenewal ? 'Renew Subscription' : 'Seller Registration'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 px-6 pb-6">
        <div className="text-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 rounded-xl p-5 border border-blue-200">
          <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            ₦{isSubscriptionRenewal 
              ? BUSINESS_RULES.sellerSubscription.monthlyFee.toLocaleString()
              : BUSINESS_RULES.sellerRegistration.fee.toLocaleString()}
          </div>
          <p className="text-sm text-gray-600 font-medium">
            {isSubscriptionRenewal 
              ? "Monthly subscription • 30 days full access"
              : "One-time registration fee to start selling"}
          </p>
        </div>

        {isSubscriptionRenewal ? (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-green-900 mb-3">
                  ✨ Premium Seller Features
                </p>
                <div className="grid grid-cols-2 gap-2 text-green-800">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Product listings
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Live bidding
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Sales dashboard
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Marketing tools
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    100% revenue
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Priority support
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-2">
                  What you get with CampusConnect:
                </p>
                <div className="grid grid-cols-1 gap-1 text-blue-800">
                  <div>• <strong>Keep 100% of sales</strong> - No commission fees</div>
                  <div>• <strong>Live feed bidding</strong> - Competitive marketplace</div>
                  <div>• <strong>Secure escrow system</strong> - Protected payments</div>
                  <div>• <strong>Sales dashboard</strong> - Track your performance</div>
                  <div>• <strong>University-focused</strong> - Target market reach</div>
                  <div>• <strong>Mobile optimized</strong> - Sell anywhere, anytime</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Keep 100% of your sales - No commission fees!
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handlePayment}
            disabled={processing}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
            size="lg"
          >
            {processing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Processing Payment...
              </div>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                Pay ₦{isSubscriptionRenewal 
                  ? BUSINESS_RULES.sellerSubscription.monthlyFee.toLocaleString()
                  : BUSINESS_RULES.sellerRegistration.fee.toLocaleString()}
              </>
            )}
          </Button>

          <Button
            onClick={onCancel}
            variant="ghost"
            className="w-full h-10 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            disabled={processing}
          >
            Cancel
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2">
          <Shield className="h-3 w-3 text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center">
            Secure payment powered by Paystack
          </p>
        </div>
        </CardContent>
      </Card>
    </div>
  );
};
