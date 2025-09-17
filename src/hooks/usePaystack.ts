import { useCallback } from 'react';
import { toast } from 'sonner';
import { API_CONFIG } from '@/lib/constants';
import { PaymentError } from '@/lib/errors';
import { PaystackResponse } from '@/lib/types';

interface PaystackConfig {
  email: string;
  amount: number; // in kobo
  currency?: string;
  ref?: string;
  onSuccess: (response: PaystackResponse) => void;
  onClose?: () => void;
}

export function usePaystack() {
  const initializePayment = useCallback((config: PaystackConfig) => {
    if (!(window as any).PaystackPop) {
      throw new PaymentError('Paystack not loaded. Check your internet connection and refresh.');
    }

    const paymentRef = config.ref || `CC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const handler = (window as any).PaystackPop.setup({
        key: API_CONFIG.paystack.publicKey,
        email: config.email,
        amount: config.amount,
        currency: config.currency || 'NGN',
        ref: paymentRef,
        callback: (response: PaystackResponse) => {
          if (response.status === 'success') {
            config.onSuccess(response);
          } else {
            toast.error('Payment was not successful. Please try again.');
          }
        },
        onClose: () => {
          config.onClose?.();
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error('Payment initialization error:', error);
      throw new PaymentError('Failed to initialize payment. Please try again.');
    }
  }, []);

  const verifyPayment = useCallback(async (reference: string): Promise<boolean> => {
    try {
      // In a real app, you'd verify with your backend
      // For now, we'll assume the payment is valid if we have a reference
      return !!reference;
    } catch (error) {
      console.error('Payment verification error:', error);
      return false;
    }
  }, []);

  return {
    initializePayment,
    verifyPayment,
  };
}