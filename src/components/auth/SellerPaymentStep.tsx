import { useState } from "react";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePaystack } from "@/hooks/usePaystack";
import { useToast } from "@/hooks/use-toast";
import { BUSINESS_RULES } from "@/lib/constants";
import { CreditCard, Shield, CheckCircle, ArrowLeft } from "lucide-react";

interface SellerPaymentStepProps {
  email: string;
  onPaymentSuccess: (paymentReference: string) => void;
  onBack: () => void;
}

export const SellerPaymentStep = ({
  email,
  onPaymentSuccess,
  onBack,
}: SellerPaymentStepProps) => {
  const [processing, setProcessing] = useState(false);
  const { initializePayment } = usePaystack();
  const { toast } = useToast();

  const handlePayment = async () => {
    setProcessing(true);

    try {
      const amount = BUSINESS_RULES.sellerRegistration.fee * 100; // Convert to kobo
      const paymentRef = `SELLER_REG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      initializePayment({
        email,
        amount,
        currency: "NGN",
        ref: paymentRef,
        onSuccess: async (response) => {
          toast({
            title: "Payment Successful!",
            description: "Registration fee paid. You can now complete your signup.",
          });
          onPaymentSuccess(response.reference);
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
          <p className="text-sm text-muted-foreground mb-3">
            One-time fee to unlock unlimited earning potential
          </p>
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm font-medium text-green-800 mb-1">
              <strong>Smart Investment:</strong> Pay once, earn forever
            </p>
            <p className="text-xs text-green-700">
              Average sellers recover this fee in their first 2-3 sales
            </p>
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

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-2">Full CampusConnect Seller Access:</p>
              <ul className="text-blue-800 space-y-1">
                <li>• <strong>0% Commission</strong> - Keep every naira you earn</li>
                <li>• <strong>Live Feed Bidding</strong> - Respond to buyer requests with competitive offers</li>
                <li>• <strong>Escrow Protection</strong> - Guaranteed payment security</li>
                <li>• <strong>WhatsApp Integration</strong> - Instant buyer communication</li>
                <li>• <strong>Analytics Dashboard</strong> - Track sales & performance</li>
                <li>• <strong>Gamification</strong> - Earn rewards & unlock features</li>
                <li>• <strong>Marketing Boost</strong> - Featured product listings</li>
                <li>• <strong>Campus Network</strong> - Reach students at your university</li>
              </ul>
            </div>
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
                Pay ₦{BUSINESS_RULES.sellerRegistration.fee.toLocaleString()}
              </>
            )}
          </Button>

          <Button
            onClick={onBack}
            variant="outline"
            className="w-full"
            disabled={processing}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Details
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Secure payment powered by Paystack. Payment required before account creation.
        </p>
      </CardContent>
    </Card>
  );
};