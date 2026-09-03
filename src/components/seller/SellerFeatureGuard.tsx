import { ReactNode, useState } from 'react';
import { useSellerSubscription } from '@/hooks/useSellerSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { SellerSubscriptionGate } from './SellerSubscriptionGate';

interface SellerFeatureGuardProps {
  children: ReactNode;
  featureName: string;
  fallbackMessage?: string;
}

export const SellerFeatureGuard = ({ 
  children, 
  featureName, 
  fallbackMessage 
}: SellerFeatureGuardProps) => {
  const { canAccessSellerFeature, renewSubscription, loading } = useSellerSubscription();
  const { user } = useAuth();
  const { toast } = useToast();

  const featureAccess = canAccessSellerFeature(featureName);

  const handleRenewal = async (paymentReference: string) => {
    try {
      const success = await renewSubscription(paymentReference);
      if (success) {
        toast({
          title: 'Subscription Renewed!',
          description: 'Your seller features have been reactivated.',
        });
      } else {
        toast({
          title: 'Renewal Failed',
          description: 'Please try again or contact support.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process subscription renewal.',
        variant: 'destructive',
      });
    }
  };

  // Show loading state or children while loading to prevent blinking
  if (loading || featureAccess.allowed) {
    return <>{children}</>;
  }

  return (
    <SellerSubscriptionGate
      reason={
        fallbackMessage ||
        'Renew your monthly subscription to continue selling and accessing premium features.'
      }
      userEmail={user?.email}
      userId={user?.id}
      onPaymentSuccess={handleRenewal}
    />
  );
};