import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SellerSubscription {
  isActive: boolean;
  expiresAt: string | null;
  subscriptionType: 'daily' | 'monthly';
  timeUntilExpiry: {
    hours?: number;
    days?: number;
    type: 'hours' | 'days';
  } | null;
}

export const useSellerSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SellerSubscription>({
    isActive: false,
    expiresAt: null,
    subscriptionType: 'daily',
    timeUntilExpiry: null
  });
  const [loading, setLoading] = useState(true);

  const checkSubscriptionStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('seller_features_active, seller_subscription_expires_at, seller_subscription_type, account_type')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Only process if user is a seller
      if (data.account_type !== 'seller' && data.account_type !== 'both') {
        setLoading(false);
        return;
      }

      const expiresAt = data.seller_subscription_expires_at;
      const subscriptionType = data.seller_subscription_type || 'daily';
      
      let timeUntilExpiry = null;
      if (expiresAt) {
        const expiryDate = new Date(expiresAt);
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.getTime();
        
        if (subscriptionType === 'daily') {
          const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
          timeUntilExpiry = { hours: diffHours, type: 'hours' as const };
        } else {
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          timeUntilExpiry = { days: diffDays, type: 'days' as const };
        }
      }

      setSubscription({
        isActive: data.seller_features_active || false,
        expiresAt,
        subscriptionType,
        timeUntilExpiry
      });

    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const renewSubscription = async (paymentReference: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase.rpc('renew_seller_subscription', {
        p_user_id: user.id,
        p_payment_reference: paymentReference
      });

      if (error) throw error;

      // Refresh subscription status
      await checkSubscriptionStatus();
      return true;
    } catch (error) {
      console.error('Error renewing subscription:', error);
      return false;
    }
  };

  const createSubscription = async (subscriptionType: 'daily' | 'monthly', paymentReference: string) => {
    if (!user) return false;

    try {
      const amount = subscriptionType === 'daily' ? 100.00 : 2000.00;
      
      const { error } = await supabase.rpc('create_seller_subscription', {
        p_user_id: user.id,
        p_subscription_type: subscriptionType,
        p_payment_reference: paymentReference,
        p_amount: amount
      });

      if (error) throw error;

      // Refresh subscription status
      await checkSubscriptionStatus();
      return true;
    } catch (error) {
      console.error('Error creating subscription:', error);
      return false;
    }
  };

  // Check if seller features should be blocked
  const canAccessSellerFeature = (featureName: string) => {
    if (!subscription.isActive) {
      return {
        allowed: false,
        reason: 'Seller subscription expired. Please renew to access this feature.'
      };
    }

    return { allowed: true, reason: null };
  };

  useEffect(() => {
    checkSubscriptionStatus();

    // Set up real-time subscription to profile changes
    const channel = supabase
      .channel('seller-subscription-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          checkSubscriptionStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    subscription,
    loading,
    renewSubscription,
    createSubscription,
    canAccessSellerFeature,
    refreshStatus: checkSubscriptionStatus
  };
};