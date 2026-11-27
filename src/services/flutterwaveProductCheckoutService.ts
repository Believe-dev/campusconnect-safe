import { supabase } from "@/integrations/supabase/client";

const PENDING_CHECKOUT_KEY = "unimarket.pendingFlutterwaveCheckout";

type FunctionResponse<T> = { ok: true; data: T } | { ok: false; message: string };

const invoke = async <T>(name: string, body?: Record<string, unknown>): Promise<FunctionResponse<T>> => {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) return { ok: false, message: error.message };
  if (data?.error) return { ok: false, message: data.error };
  return { ok: true, data: data as T };
};

export type FlutterwaveCheckoutItem = {
  cartItemId: string;
  productId: string;
  quantity: number;
  selectedSize?: string | null;
};

export type FlutterwaveCheckoutQueueItem = {
  sellerId: string;
  items: FlutterwaveCheckoutItem[];
};

export type PendingFlutterwaveCheckout = {
  buyerId: string;
  queue: FlutterwaveCheckoutQueueItem[];
  nextIndex: number;
  shippingAddress: string;
  universityName: string;
  orderId: string;
  paymentReference: string;
  cartItemIds: string[];
};

export const readPendingFlutterwaveCheckout = (): PendingFlutterwaveCheckout | null => {
  try {
    const raw = sessionStorage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as PendingFlutterwaveCheckout;
    if (!value?.buyerId || !Array.isArray(value.queue) || !value.orderId || !value.paymentReference) return null;
    return value;
  } catch {
    return null;
  }
};

export const savePendingFlutterwaveCheckout = (checkout: PendingFlutterwaveCheckout) => {
  sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(checkout));
};

export const clearPendingFlutterwaveCheckout = () => {
  sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
};

export const initiateFlutterwaveProductCheckout = async (params: {
  items: FlutterwaveCheckoutItem[];
  shippingAddress: string;
  universityName: string;
}): Promise<{ success: boolean; orderId?: string; paymentReference?: string; amount?: number; paymentLink?: string; message?: string }> => {
  const response = await invoke<{ orderId: string; paymentReference: string; amount: number; paymentLink: string }>(
    "flutterwave-product-checkout-init",
    params
  );
  if (!response.ok) return { success: false, message: response.message };
  return { success: true, ...response.data };
};

export const verifyFlutterwaveProductCheckout = async (
  transactionId: string,
  txRef: string
): Promise<{ verified: boolean; message: string; orderId?: string; alreadyProcessed?: boolean }> => {
  const response = await invoke<{ verified: boolean; message: string; orderId: string; alreadyProcessed: boolean }>(
    "flutterwave-product-checkout-verify",
    { transactionId, txRef }
  );
  if (!response.ok) return { verified: false, message: response.message };
  return response.data;
};
