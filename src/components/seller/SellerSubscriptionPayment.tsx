import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CreditCard, X } from 'lucide-react';

interface SellerSubscriptionPaymentProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

// NOTE: this previously called createSubscription() with a client-generated reference
// and no real payment collection or verification behind it (first the Paystack widget
// callback with a hardcoded test key, then briefly an unconditional fake success after
// the Anchor rename) - either way it granted an active paid subscription for free.
// Disabled fail-safe, matching usePaystack.ts, pending a real Anchor-backed collection
// flow. Paystack is off the table entirely (account disabled).
export const SellerSubscriptionPayment = ({ onCancel }: SellerSubscriptionPaymentProps) => {
  const handlePayment = () => {
    toast.error('Subscription payment is temporarily unavailable. Please contact support.');
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Monthly Subscription
          </CardTitle>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">₦1,000</div>
          <p className="text-sm text-muted-foreground">per month</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">What you get:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Unlimited product listings</li>
            <li>• Live feed bidding participation</li>
            <li>• Advanced sales dashboard</li>
            <li>• Marketing tools and promotions</li>
            <li>• Priority customer support</li>
            <li>• 30 days full access</li>
          </ul>
        </div>

        <Button
          onClick={handlePayment}
          className="w-full"
          size="lg"
        >
          Pay ₦1,000 - Activate Subscription
        </Button>

        <p className="text-xs text-center text-emerald-600 font-medium">
          Secure payment powered by Anchor BaaS (CoreStep Microfinance)
        </p>
      </CardContent>
    </Card>
  );
};