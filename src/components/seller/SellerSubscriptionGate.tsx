import { useState } from "react";
import {
  BarChart3,
  Building2,
  CreditCard,
  Headset,
  Lock,
  Megaphone,
  PackageCheck,
  PauseCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/enhanced-button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SellerRegistrationPayment } from "./SellerRegistrationPayment";

interface SellerSubscriptionGateProps {
  reason: string;
  userEmail?: string;
  userId?: string;
  onPaymentSuccess: (paymentReference: string) => void;
}

const PERKS = [
  { icon: PackageCheck, label: "Unlimited listings" },
  { icon: BarChart3, label: "Sales dashboard & analytics" },
  { icon: Megaphone, label: "Marketing & promotion tools" },
  { icon: Headset, label: "Priority buyer support" },
];

// Shared full-page paused state for an expired seller subscription - was
// previously duplicated near-verbatim (blue/purple/indigo gradients, shadcn
// Card/Badge, a stale "Live feed bidding access" perk from before Live Feed
// was paused) in both ProtectedSellerRoute and SellerFeatureGuard. Rebuilt
// again after the first flora pass still read as a generic icon-in-circle
// paywall template - the tilted "paused" card below deliberately echoes the
// hero's own tilted product-card language (Index.tsx) instead of a stock
// centered-lock-icon composition, and only the renew button carries the
// vibrant gradient so it's the one thing that visually demands action.
export const SellerSubscriptionGate = ({
  reason,
  userEmail,
  userId,
  onPaymentSuccess,
}: SellerSubscriptionGateProps) => {
  const [showPayment, setShowPayment] = useState(false);

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-flora-bgFrom to-flora-bgTo p-4">
        <div className="w-full max-w-lg">
          {/* Muted, slightly desaturated "membership card" tilted the same
              way the home hero's product cards are - the grayscale-leaning
              palette itself communicates "paused" without needing a lock
              icon; the Paused pill overlaps the corner the way the hero's
              own floating badges do. */}
          <div className="relative mx-auto mb-8 w-64">
            <div className="rotate-[-4deg] rounded-3xl border border-flora-ink/10 bg-flora-chip p-5 shadow-card">
              <div className="flex items-center justify-between">
                <Building2 className="h-6 w-6 text-flora-muted" strokeWidth={1.5} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-flora-muted">
                  Seller Account
                </span>
              </div>
              <div className="mt-8 h-2.5 w-28 rounded-full bg-flora-ink/10" />
              <div className="mt-2 h-2.5 w-20 rounded-full bg-flora-ink/10" />
            </div>
            <div className="absolute -bottom-3 right-2 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-floating">
              <PauseCircle className="h-3.5 w-3.5" />
              Paused
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-flora-muted">
              Seller subscription
            </p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-flora-ink sm:text-4xl">
              Time to renew
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-flora-muted">
              {reason}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-5">
            {PERKS.map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex items-start gap-2.5">
                <Icon
                  className={i % 2 === 0 ? "h-5 w-5 shrink-0 text-flora-leaf" : "h-5 w-5 shrink-0 text-flora-ink"}
                  strokeWidth={1.5}
                />
                <span className="text-sm text-flora-ink">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-flora-ink/10 pt-5">
            <div>
              <p className="text-sm font-semibold text-flora-ink">Zero commission, always</p>
              <p className="text-xs text-flora-muted">Keep 100% of every sale</p>
            </div>
            <p className="text-2xl font-bold text-flora-ink">
              ₦1,000<span className="text-sm font-medium text-flora-muted">/mo</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPayment(true)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-flora-leafBright to-flora-leaf px-6 py-4 text-base font-bold text-white shadow-floating transition hover:brightness-105"
          >
            <CreditCard className="h-5 w-5" />
            Renew now
          </button>

          <div className="mt-3 flex items-center justify-center gap-2 text-flora-muted">
            <Lock className="h-3.5 w-3.5" />
            <p className="text-center text-xs sm:text-sm">
              Secure payment powered by Anchor BaaS (CoreStep Microfinance)
            </p>
          </div>
        </div>
      </div>

      {showPayment && (
        <Dialog open={showPayment} onOpenChange={setShowPayment}>
          {/* SellerRegistrationPayment renders its own full flora card, so
              this shell stays transparent rather than wrapping it in a
              second card - just a floating close button on top. */}
          <DialogContent className="z-[9999] max-w-md border-0 bg-transparent p-0 shadow-none sm:max-w-lg">
            <div className="relative z-[9999]">
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-3 top-3 z-10 h-9 w-9 rounded-full bg-flora-chip text-flora-ink hover:bg-flora-chip/70"
                onClick={() => setShowPayment(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              <SellerRegistrationPayment
                userEmail={userEmail || ""}
                userId={userId || ""}
                onPaymentSuccess={(paymentReference) => {
                  setShowPayment(false);
                  onPaymentSuccess(paymentReference);
                }}
                onCancel={() => setShowPayment(false)}
                isSubscriptionRenewal={true}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default SellerSubscriptionGate;
