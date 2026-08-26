export interface AnchorPaymentConfig {
  email: string;
  amount: number;
  currency?: string;
  ref?: string;
  onSuccess?: (response: { reference: string; status: string }) => void;
  onClose?: () => void;
}

export interface PaystackConfig {
  key?: string;
  email: string;
  amount: number;
  currency: string;
  ref: string;
  callback?: (response: any) => void;
  onClose?: () => void;
}

export const generatePaymentRef = () => {
  return `ANCHOR_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
};

export const initializePaystackPayment = (config: PaystackConfig) => {
  console.log("Paystack is deprecated. Using Anchor BaaS Payment Gateway instead.", config);
};