import { verifyFlutterwaveTransaction } from "./flutterwaveSellerRegistration.ts";

export type SellerMembershipPaymentIntent = {
  id: string;
  user_id: string;
  purpose: "registration" | "renewal";
  amount: number | string;
  currency: "NGN";
  payment_reference: string;
  flutterwave_transaction_id: string | null;
  status: "pending" | "completed" | "expired";
};

/**
 * Flutterwave only tells us that a checkout returned; this function re-queries
 * the transaction and then delegates the state change to one locked database
 * transaction. It is safe to call from either the browser callback or a signed
 * Flutterwave webhook.
 */
export const verifyAndSettleFlutterwaveSellerMembershipPayment = async (
  admin: any,
  intent: SellerMembershipPaymentIntent,
  transactionId: string
): Promise<{ verified: boolean; completed: boolean; message: string }> => {
  if (intent.status === "completed") {
    if (intent.flutterwave_transaction_id !== transactionId) {
      return { verified: false, completed: false, message: "This checkout was already completed by another transaction." };
    }
    return { verified: true, completed: true, message: "Flutterwave payment already completed." };
  }
  if (intent.status !== "pending") {
    return { verified: false, completed: false, message: "This checkout can no longer be used." };
  }

  const transaction = await verifyFlutterwaveTransaction(transactionId);
  const valid =
    transaction.status === "successful" &&
    transaction.tx_ref === intent.payment_reference &&
    transaction.currency === intent.currency &&
    Number(transaction.amount) === Number(intent.amount);
  if (!valid) {
    return { verified: false, completed: false, message: "Flutterwave could not confirm the expected seller payment." };
  }

  const { error } = await admin.rpc("settle_flutterwave_seller_membership_payment", {
    p_payment_reference: intent.payment_reference,
    p_flutterwave_transaction_id: transactionId,
  });
  if (error) throw error;

  return { verified: true, completed: true, message: "Flutterwave payment confirmed." };
};
