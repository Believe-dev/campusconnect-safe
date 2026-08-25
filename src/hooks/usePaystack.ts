import { useCallback } from 'react';
import { toast } from 'sonner';
import { AnchorPaymentResponse } from '@/lib/types';

interface AnchorPaymentConfig {
  email: string;
  amount: number; // in kobo or NGN
  currency?: string;
  ref?: string;
  onSuccess: (response: AnchorPaymentResponse) => void;
  onClose?: () => void;
}

// NOTE: this previously dispatched a "transfer" straight to Anchor with no payment
// instrument collected anywhere in the seller registration/subscription UI (no card
// form, no bank transfer confirmation) and unconditionally reported success -
// meaning the ₦1,000 seller subscription fee was never actually collected from
// anyone. verifyPayment() also unconditionally returned true for any non-empty
// reference. Both were fail-open in the same way the escrow payment verification was.
//
// This is disabled fail-safe (no free subscriptions) rather than left fake-succeeding,
// pending a decision on the real collection flow: reuse the anchor-checkout
// (buyer-transfers-to-a-dedicated-NUBAN) pattern, or a card gateway. Flagged
// separately from the escrow remediation - it wasn't part of that scope.
export function usePaystack() {
  const initializePayment = useCallback(async (config: AnchorPaymentConfig) => {
    toast.error('Seller subscription payment is temporarily unavailable. Please contact support.');
    config.onClose?.();
  }, []);

  const verifyPayment = useCallback(async (_reference: string): Promise<boolean> => {
    return false;
  }, []);

  return {
    initializePayment,
    verifyPayment,
  };
}