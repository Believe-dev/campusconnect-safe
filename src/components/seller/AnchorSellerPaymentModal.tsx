import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Shield, Building2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAnchorPayment } from "@/hooks/useAnchorPayment";

interface AnchorSellerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  purpose: "registration" | "renewal";
  amount: number;
  intentId: string;
  nubanAccount: string;
  bankName?: string;
  userName: string;
  onVerified: () => void;
}

// Same NUBAN-display + "I've transferred" verify flow as the checkout
// AnchorPaymentModal, adapted for the seller registration/renewal fee
// instead of an order.
export const AnchorSellerPaymentModal: React.FC<AnchorSellerPaymentModalProps> = ({
  isOpen,
  onClose,
  purpose,
  amount,
  intentId,
  nubanAccount,
  bankName,
  userName,
  onVerified,
}) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { verifyPayment } = useAnchorPayment();

  const [verifying, setVerifying] = useState(false);

  const handleCopyNuban = () => {
    if (!nubanAccount) return;
    navigator.clipboard.writeText(nubanAccount);
    setCopied(true);
    toast({
      title: "Account Number Copied!",
      description: `${nubanAccount} copied to clipboard.`,
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConfirm = async () => {
    setVerifying(true);
    try {
      const res = await verifyPayment(intentId);
      if (res.verified) {
        toast({
          title: "Bank Deposit Verified! ✅",
          description: res.message,
        });
        onVerified();
      } else {
        toast({
          title: "Transfer Not Found",
          description: res.message || "No deposit detected yet. Please ensure you sent the funds and try again.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Anchor Verification Error",
        description: err?.message || "Failed to verify deposit on Anchor API. Please check your network and try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const title = purpose === "registration" ? "Seller registration fee" : "Renew seller subscription";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="overflow-hidden rounded-3xl border-0 bg-flora-card p-0 shadow-floating sm:max-w-md">
        <div className="p-6 pb-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 rounded-full bg-flora-tagBg px-3 py-1 text-xs font-semibold text-flora-tagText">
              <Shield className="h-3.5 w-3.5" />
              Anchor Sub-Ledger
            </span>
          </div>
          <DialogTitle className="mb-1 text-2xl font-bold text-flora-ink">{title}</DialogTitle>
          <DialogDescription className="text-sm text-flora-muted">
            Amount due:{" "}
            <strong className="text-lg font-bold text-flora-ink">₦{amount.toLocaleString()}</strong>
          </DialogDescription>
        </div>

        <div className="space-y-5 px-6 pb-6">
          <div className="space-y-3 rounded-2xl bg-flora-chip p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-flora-ink">
                <Building2 className="h-3.5 w-3.5" />
                Transfer to this account
              </span>
              <span className="text-xs font-semibold text-flora-leaf">Instant deposit</span>
            </div>

            <div className="space-y-2.5 rounded-xl border border-flora-ink/10 bg-white p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-flora-muted">Bank name:</span>
                <span className="font-bold text-flora-ink">
                  {bankName || "CoreStep Microfinance (Anchor)"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-flora-muted">Account number:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold tracking-widest text-flora-leaf">
                    {nubanAccount || "Generating Anchor NUBAN..."}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyNuban}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-flora-ink/15 text-flora-ink transition hover:bg-flora-chip"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-flora-leaf" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-flora-muted">Account name:</span>
                <span className="font-semibold text-flora-ink">UniMarket / {userName || "Seller"}</span>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-flora-muted">
              Open your GTBank, Zenith, Access, Kuda, or PalmPay app and transfer{" "}
              <strong className="text-flora-ink">₦{amount.toLocaleString()}</strong> to the account above,
              then confirm below.
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={verifying}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-flora-leafBright to-flora-leaf text-base font-bold text-white shadow-floating transition hover:brightness-105 disabled:opacity-60"
            >
              {verifying ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Verifying deposit...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  I've transferred ₦{amount.toLocaleString()}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={verifying}
              className="w-full py-2 text-xs font-medium text-flora-muted transition hover:text-flora-ink disabled:opacity-60"
            >
              Cancel payment
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
