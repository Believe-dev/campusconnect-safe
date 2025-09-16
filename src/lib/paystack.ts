export interface PaystackConfig {
  key: string;
  email: string;
  amount: number;
  currency: string;
  ref: string;
  callback: (response: any) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: PaystackConfig) => {
        openIframe: () => void;
      };
    };
  }
}

export const initializePaystackPayment = (config: PaystackConfig) => {
  if (typeof window !== 'undefined' && window.PaystackPop) {
    const handler = window.PaystackPop.setup(config);
    handler.openIframe();
  } else {
    console.error('Paystack SDK not loaded');
  }
};

export const generatePaymentRef = () => {
  return `CC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};