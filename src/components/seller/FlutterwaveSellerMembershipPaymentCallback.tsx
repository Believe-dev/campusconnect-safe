import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { verifyFlutterwaveSellerMembershipPayment } from "@/services/flutterwaveSellerMembershipService";

type CallbackState = "verifying" | "success" | "failed" | "cancelled";

export const FlutterwaveSellerMembershipPaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>("verifying");
  const [message, setMessage] = useState("Confirming your Flutterwave payment securely…");

  useEffect(() => {
    let active = true;
    const verify = async () => {
      const status = searchParams.get("status");
      const transactionId = searchParams.get("transaction_id");
      const txRef = searchParams.get("tx_ref");
      if (status !== "successful" || !transactionId || !txRef) {
        if (active) {
          setState("cancelled");
          setMessage("The payment was not completed. Your seller access has not changed.");
        }
        return;
      }
      const result = await verifyFlutterwaveSellerMembershipPayment(transactionId, txRef);
      if (!active) return;
      if (!result.verified || !result.completed) {
        setState("failed");
        setMessage(result.message || "We could not verify this payment. Your seller access has not changed.");
        return;
      }
      setState("success");
      setMessage("Payment confirmed. Your seller access is now active.");
      window.setTimeout(() => navigate("/profile", { replace: true }), 1600);
    };
    verify().catch(() => {
      if (active) {
        setState("failed");
        setMessage("We could not verify this payment yet. Your seller access has not changed.");
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
        <h1 className="mt-5 text-2xl font-bold text-flora-ink">{pending ? "Verifying payment" : success ? "Seller payment complete" : "Payment needs attention"}</h1>
        <p className="mt-3 text-sm leading-6 text-flora-muted">{message}</p>
        {!pending && !success && <Link to="/profile" className="mt-6 inline-flex rounded-full bg-flora-ink px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110">Return to profile</Link>}
      </section>
    </main>
  );
};

export default FlutterwaveSellerMembershipPaymentCallback;
