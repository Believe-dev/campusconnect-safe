import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  clearPendingFlutterwaveCheckout,
  readPendingFlutterwaveCheckout,
  savePendingFlutterwaveCheckout,
  verifyFlutterwaveProductCheckout,
} from "@/services/flutterwaveProductCheckoutService";

type CallbackState = "verifying" | "success" | "failed" | "cancelled";

export const FlutterwaveProductPaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>("verifying");
  const [message, setMessage] = useState("Confirming your Flutterwave payment securely…");

  useEffect(() => {
    let active = true;

    const finishPayment = async () => {
      const transactionId = searchParams.get("transaction_id");
      const txRef = searchParams.get("tx_ref");
      if (!transactionId || !txRef) {
        if (active) {
          setState("cancelled");
          setMessage("The payment was not completed. Your order has not been placed.");
        }
        return;
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Please sign in again to confirm this payment.");

      const payment = await verifyFlutterwaveProductCheckout(transactionId, txRef);
      if (!payment.verified || !payment.orderId) {
        if (active) {
          setState("failed");
          setMessage(payment.message || "We could not verify this payment. Your order has not been placed.");
        }
        return;
      }

      const pending = readPendingFlutterwaveCheckout();
      if (pending?.buyerId === user.user.id && pending.orderId === payment.orderId && pending.paymentReference === txRef) {
        const nextIndex = pending.nextIndex + 1;
        if (nextIndex < pending.queue.length) {
          savePendingFlutterwaveCheckout({ ...pending, nextIndex, orderId: "", paymentReference: "", cartItemIds: [] });
          if (active) {
            setState("success");
            setMessage("Payment confirmed. Preparing your next seller payment…");
            window.setTimeout(() => navigate("/checkout?flutterwave_resume=1", { replace: true }), 900);
          }
          return;
        }
        clearPendingFlutterwaveCheckout();
      }

      if (active) {
        setState("success");
        setMessage("Payment confirmed. Your order is now protected by escrow.");
        window.setTimeout(() => navigate("/orders", { replace: true }), 1100);
      }
    };

    finishPayment().catch((error) => {
      if (active) {
        setState("failed");
        setMessage(error instanceof Error ? error.message : "We could not verify this payment yet.");
      }
    });
    return () => { active = false; };
  }, [navigate, searchParams]);

  const pending = state === "verifying";
  const success = state === "success";

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4">
      <section className="w-full max-w-md rounded-3xl bg-flora-card p-8 text-center shadow-floating">
        {pending ? <LoaderCircle className="mx-auto h-12 w-12 animate-spin text-flora-leaf" /> : success ? <CheckCircle2 className="mx-auto h-12 w-12 text-flora-leaf" /> : <XCircle className="mx-auto h-12 w-12 text-red-500" />}
        <h1 className="mt-5 text-2xl font-bold text-flora-ink">{pending ? "Verifying payment" : success ? "Payment confirmed" : "Payment needs attention"}</h1>
        <p className="mt-3 text-sm leading-6 text-flora-muted">{message}</p>
        {!pending && !success && (
          <Link to="/checkout" className="mt-6 inline-flex rounded-full bg-flora-ink px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110">
            Return to checkout
          </Link>
        )}
      </section>
    </main>
  );
};

export default FlutterwaveProductPaymentCallback;
