// Applies the side effects of a confirmed seller registration/renewal payment.
// Used by both anchor-seller-payment-verify (manual "I've paid" check) and the
// Anchor webhook handler (nip.inbound.completed), so a payment is completed
// exactly the same way regardless of which one notices it first.

// Every write below is checked and throws on failure - the caller (both
// anchor-seller-payment-verify and the webhook handler) relies on that to
// keep seller_payment_intents.status at 'completing' rather than 'paid' when
// any step here fails, so the intent stays retryable instead of silently
// reporting success while seller_features_active never actually flips on.
export async function completeSellerRegistration(
  admin: any,
  userId: string,
  paymentReference: string,
  amount: number
): Promise<void> {
  const { error: paymentInsertError } = await admin.from("seller_registration_payments").insert({
    user_id: userId,
    amount,
    payment_reference: paymentReference,
    payment_method: "anchor",
    status: "completed",
  });
  if (paymentInsertError) throw paymentInsertError;

  const { error: profileUpdateError } = await admin
    .from("profiles")
    .update({
      seller_registration_paid: true,
      seller_registration_paid_at: new Date().toISOString(),
      account_type: "seller",
      seller_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (profileUpdateError) throw profileUpdateError;

  // create_seller_subscription is service_role-only - this call qualifies
  // since this helper only ever runs inside edge functions using the
  // service-role client.
  const { error: subscriptionError } = await admin.rpc("create_seller_subscription", {
    p_user_id: userId,
    p_subscription_type: "monthly",
    p_payment_reference: paymentReference,
    p_amount: amount,
  });
  if (subscriptionError) throw subscriptionError;
}

export async function completeSellerRenewal(admin: any, userId: string, paymentReference: string): Promise<void> {
  const { error } = await admin.rpc("renew_seller_subscription", {
    p_user_id: userId,
    p_payment_reference: paymentReference,
  });
  if (error) throw error;
}
