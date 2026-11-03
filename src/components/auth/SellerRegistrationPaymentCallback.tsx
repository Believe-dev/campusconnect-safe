import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  claimFlutterwaveSellerRegistration,
  verifyFlutterwaveSellerRegistration,
  type PendingSellerSignup,
} from "@/services/flutterwaveSellerRegistrationService";
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from "@/lib/legalVersions";

type CallbackState = "verifying" | "success" | "failed" | "cancelled";

export const SellerRegistrationPaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>("verifying");
  const [message, setMessage] = useState("Confirming your Flutterwave payment securely…");

  useEffect(() => {
    let active = true;
    const finishPayment = async () => {
      const status = searchParams.get("status");
      const transactionId = searchParams.get("transaction_id");
      const txRef = searchParams.get("tx_ref");
      const storedSignup = sessionStorage.getItem("unimarket.pendingSellerSignup");
      const pending = storedSignup
        ? (JSON.parse(storedSignup) as { signup: PendingSellerSignup; claimToken?: string })
        : null;

      if (status !== "successful" || !transactionId || !txRef || !pending?.claimToken) {
        if (active) {
          setState("cancelled");
          setMessage("The payment was not completed. No seller account was created.");
        }
        return;
      }

      const payment = await verifyFlutterwaveSellerRegistration(transactionId, txRef, pending.claimToken);
      if (!payment.verified) {
        if (active) {
          setState("failed");
          setMessage(payment.message || "We could not verify this payment. No seller account was created.");
        }
        return;
      }

      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: pending.signup.email,
        password: pending.signup.password,
        options: {
          data: {
            full_name: pending.signup.fullName,
            university_name: pending.signup.university,
            phone_number: pending.signup.phone,
            business_name: pending.signup.businessName,
            student_id: pending.signup.studentId,
            account_type: "seller",
            bio: pending.signup.bio,
          },
        },
      });
      if (signupError) throw signupError;

      // On projects with email confirmation disabled (the current app flow),
      // signUp returns a session. If an existing account was used, signing in
      // with the supplied password lets it claim its completed payment.
      let session = signupData.session;
      if (!session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: pending.signup.email,
          password: pending.signup.password,
        });
        if (signInError || !signInData.session) {
          throw new Error("Payment is verified. Sign in after confirming your email to activate your seller account.");
        }
        session = signInData.session;
      }

      // Some projects create the profile asynchronously from the auth trigger.
      // Persist these non-payment-gated fields before the server claims the
      // verified payment, retrying briefly until that profile exists.
      const profileUpdate = {
        business_name: pending.signup.businessName,
        bio: pending.signup.bio,
        date_of_birth: pending.signup.dateOfBirth,
        terms_accepted_version: CURRENT_TERMS_VERSION,
        terms_accepted_at: new Date().toISOString(),
        privacy_accepted_version: CURRENT_PRIVACY_VERSION,
        privacy_accepted_at: new Date().toISOString(),
      };
      let profileReady = false;
      for (const delay of [0, 400, 800, 1200, 1600]) {
        if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay));
        const { data: updatedProfile } = await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("user_id", session.user.id)
          .select("user_id");
        if (updatedProfile?.length) {
          profileReady = true;
          break;
        }
      }
      if (!profileReady) throw new Error("Your account was created, but its profile is still being prepared. Please sign in again shortly.");

      const claim = await claimFlutterwaveSellerRegistration(txRef, pending.claimToken);
      if (!active) return;

      if (claim.claimed) {
        if (pending.signup.referralCode) {
          const { data: referrer } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("referral_code", pending.signup.referralCode.toUpperCase())
            .maybeSingle();
          if (referrer) {
            await supabase.from("referrals").insert({
              referrer_id: referrer.user_id,
              referred_id: session.user.id,
            });
          }
        }
        sessionStorage.removeItem("unimarket.pendingSellerSignup");
        setState("success");
        setMessage("Payment confirmed. Your seller account is now active.");
        window.setTimeout(() => navigate("/", { replace: true }), 1600);
      } else {
        setState("failed");
        setMessage(claim.message || "Your payment was verified but seller account activation failed.");
      }
    };

    finishPayment().catch(() => {
      if (active) {
        setState("failed");
        setMessage("We could not verify this payment yet. Please try again from your profile.");
      }
    });

    return () => {
      active = false;
    };
  }, [navigate, searchParams]);

  const success = state === "success";
  const pending = state === "verifying";

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4">
      <section className="w-full max-w-md rounded-3xl bg-flora-card p-8 text-center shadow-floating">
        {pending ? (
          <LoaderCircle className="mx-auto h-12 w-12 animate-spin text-flora-leaf" />
        ) : success ? (
          <CheckCircle2 className="mx-auto h-12 w-12 text-flora-leaf" />
        ) : (
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
        )}
        <h1 className="mt-5 text-2xl font-bold text-flora-ink">
          {pending ? "Verifying payment" : success ? "Seller registration complete" : "Payment needs attention"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-flora-muted">{message}</p>
        {!pending && !success && (
          <Link
            to="/auth?mode=signup"
            className="mt-6 inline-flex rounded-full bg-flora-ink px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Try seller signup again
          </Link>
        )}
      </section>
    </main>
  );
};

export default SellerRegistrationPaymentCallback;
