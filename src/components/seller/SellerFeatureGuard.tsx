import React, { useState } from 'react';
import { useSellerSubscription } from '@/hooks/useSellerSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { AlertTriangle, CreditCard, Lock } from 'lucide-react';
import { SellerRegistrationPayment } from './SellerRegistrationPayment';
import { useAuth } from '@/hooks/useAuth';

interface SellerFeatureGuardProps {
  children: React.ReactNode;
  featureName: string;
  fallbackMessage?: string;
}

export const SellerFeatureGuard: React.FC<SellerFeatureGuardProps> = ({
  children,
  featureName,
  fallbackMessage = 'This feature requires an active seller subscription.'
}) => {
  const { user } = useAuth();
  const { canAccessSellerFeature } = useSellerSubscription();
  const [showPayment, setShowPayment] = useState(false);

  const featureAccess = canAccessSellerFeature(featureName);

  if (!featureAccess.allowed) {
    return (
      <>
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Lock className="h-5 w-5" />
              Feature Locked
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-orange-800">
              {featureAccess.reason || fallbackMessage}
            </p>
            <Button
              onClick={() => setShowPayment(true)}
              className="w-full"
              variant="default"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Renew Subscription
            </Button>
          </CardContent>
        </Card>

        {showPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <SellerRegistrationPayment
              userEmail={user?.email || ""}
              userId={user?.id || ""}
              onPaymentSuccess={() => {
                setShowPayment(false);
                window.location.reload();
              }}
              onCancel={() => setShowPayment(false)}
            />
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
};