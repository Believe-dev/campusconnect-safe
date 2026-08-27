// Applies the side effects of a confirmed seller registration/renewal payment.
// Used by both anchor-seller-payment-verify (manual "I've paid" check) and the
// Anchor webhook handler (nip.inbound.completed), so a payment is completed
// exactly the same way regardless of which one notices it first.

export async function completeSellerRegistration(
  admin: any,
  userId: string,
  paymentReference: string,
  amount: number
): Promise<void> {
  await admin.from("seller_registration_payments").insert({
    user_id: userId,
    amount,
    payment_reference: paymentReference,
    payment_method: "anchor",
    status: "completed",
  });

  await admin
    .from("profiles")
    .update({
      seller_registration_paid: true,
      seller_registration_paid_at: new Date().toISOString(),
      account_type: "seller",
      seller_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // create_seller_subscription is service_role-only - this call qualifies
  // since this helper only ever runs inside edge functions using the
  // service-role client.
  await admin.rpc("create_seller_subscription", {
    p_user_id: userId,
    p_subscription_type: "monthly",
    p_payment_reference: paymentReference,
    p_amount: amount,
  });
}

export async function completeSellerRenewal(admin: any, userId: string, paymentReference: string): Promise<void> {
  await admin.rpc("renew_seller_subscription", {
    p_user_id: userId,
    p_payment_reference: paymentReference,
  });
}
