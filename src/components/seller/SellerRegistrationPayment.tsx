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
  onPaymentSuccess: () => void;
  onCancel: () => void;
}

export const SellerRegistrationPayment = ({
  userEmail,
  userId,
  onPaymentSuccess,
  onCancel,
}: SellerRegistrationPaymentProps) => {
  const [processing, setProcessing] = useState(false);
  const { initializePayment } = usePaystack();
  const { toast } = useToast();

  const handlePayment = async () => {
    setProcessing(true);

    try {
      const amount = BUSINESS_RULES.sellerRegistration.fee * 100; // Convert to kobo
      const paymentRef = `SELLER_REG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      initializePayment({
        email: userEmail,
        amount,
        currency: "NGN",
        ref: paymentRef,
        onSuccess: async (response) => {
          try {
            // Record the payment in seller_registration_payments table
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

            // Update user profile to mark registration fee as paid
            const { error: profileError } = await supabase
              .from("profiles")
              .update({
                seller_registration_paid: true,
                seller_registration_paid_at: new Date().toISOString(),
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

            onPaymentSuccess();
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <CreditCard className="h-5 w-5" />
          Seller Registration Fee
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary mb-2">
            ₦{BUSINESS_RULES.sellerRegistration.fee.toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground">
            One-time registration fee to start selling
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-2">What you get with CampusConnect:</p>
              <ul className="text-blue-800 space-y-1">
                <li>• <strong>Keep 100% of sales</strong> - No commission fees ever</li>
                <li>• <strong>Live feed bidding</strong> - Post requests & receive competitive bids</li>
                <li>• <strong>Secure escrow system</strong> - Payment guaranteed on delivery</li>
                <li>• <strong>Built-in chat system</strong> - Direct WhatsApp & in-app messaging</li>
                <li>• <strong>Sales dashboard</strong> - Track earnings, orders & analytics</li>
                <li>• <strong>Gamified experience</strong> - Earn coins, badges & rewards</li>
                <li>• <strong>Marketing tools</strong> - Boost visibility with featured listings</li>
                <li>• <strong>University-focused</strong> - Reach your exact target market</li>
                <li>• <strong>Instant notifications</strong> - Never miss an order or message</li>
                <li>• <strong>Dispute protection</strong> - Fair resolution system</li>
                <li>• <strong>Multiple payment options</strong> - Cards, transfers, USSD</li>
                <li>• <strong>Mobile optimized</strong> - Sell anywhere, anytime</li>
              </ul>
            </div>
          </div>
        </div>

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
            className="w-full"
            variant="brand"
          >
            {processing ? (
              "Processing..."
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay ₦{BUSINESS_RULES.sellerRegistration.fee.toLocaleString()} with Paystack
              </>
            )}
          </Button>

          <Button
            onClick={onCancel}
            variant="outline"
            className="w-full"
            disabled={processing}
          >
            Cancel
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Secure payment powered by Paystack. Your payment information is encrypted and secure.
        </p>
      </CardContent>
    </Card>
  );
};