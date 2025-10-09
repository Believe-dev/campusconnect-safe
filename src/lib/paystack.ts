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
    // Ensure production mode - no test/simulation modes
    const productionConfig = {
      ...config,
      // Force live mode by using production key
      key: config.key.startsWith('pk_live_') ? config.key : config.key.replace('pk_test_', 'pk_live_'),
      // Disable any test flags
      test: false,
      simulation: false,
      debug: false
    };
    
    const handler = window.PaystackPop.setup(productionConfig);
    handler.openIframe();
  } else {
    console.error('Paystack SDK not loaded');
  }
};

export const generatePaymentRef = () => {
  return `CC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};