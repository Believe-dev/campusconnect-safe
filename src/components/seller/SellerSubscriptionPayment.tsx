import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useSellerSubscription } from '@/hooks/useSellerSubscription';
import { toast } from 'sonner';
import { CreditCard, X } from 'lucide-react';

interface SellerSubscriptionPaymentProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const SellerSubscriptionPayment = ({ onSuccess, onCancel }: SellerSubscriptionPaymentProps) => {
  const { user } = useAuth();
  const { createSubscription } = useSellerSubscription();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!user) return;

    setLoading(true);
    
    try {
      // Initialize Paystack payment
      const handler = (window as any).PaystackPop.setup({
        key: 'pk_test_4c0f8c8b8b8b8b8b8b8b8b8b8b8b8b8b', // Replace with actual public key
        email: user.email,
        amount: 100000, // ₦1,000 in kobo
        currency: 'NGN',
        ref: `seller_sub_${user.id}_${Date.now()}`,
        metadata: {
          user_id: user.id,
          subscription_type: 'monthly'
        },
        callback: async (response: any) => {
          try {
            const success = await createSubscription(response.reference);
            if (success) {
              toast.success('Subscription activated! You now have access to all seller features.');
              onSuccess?.();
            } else {
              toast.error('Failed to activate subscription. Please contact support.');
            }
          } catch (error) {
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        onClose: () => {
          setLoading(false);
        }
      });

      handler.openIframe();
    } catch (error) {
      toast.error('Payment initialization failed. Please try again.');
      setLoading(false);
    }
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
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? 'Processing...' : 'Pay ₦1,000 - Activate Subscription'}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Secure payment powered by Paystack
        </p>
      </CardContent>
    </Card>
  );
};