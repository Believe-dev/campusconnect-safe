import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
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

  const title = purpose === "registration" ? "Seller Registration Fee" : "Renew Seller Subscription";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-2 border-emerald-500/30">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Badge className="bg-white/20 text-white hover:bg-white/30 border-0 font-medium">
              <Shield className="h-3.5 w-3.5 mr-1" />
              Anchor Sub-Ledger
            </Badge>
            <span className="text-xs font-mono text-emerald-100 uppercase tracking-widest">Anchor BaaS</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-white mb-1">{title}</DialogTitle>
          <DialogDescription className="text-emerald-100 text-sm">
            Amount Due: <strong className="text-white text-lg font-bold">₦{amount.toLocaleString()}</strong>
          </DialogDescription>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Transfer to This Payment's Anchor Sub-Ledger Account
              </span>
              <span className="text-xs text-emerald-600 font-semibold">Instant Deposit</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900 space-y-2.5 shadow-sm">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Bank Name:</span>
                <span className="font-bold text-foreground">{bankName || "CoreStep Microfinance (Anchor)"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Account Number:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-emerald-600 tracking-widest">
                    {nubanAccount || "Generating Anchor NUBAN..."}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={handleCopyNuban}
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Account Name:</span>
                <span className="font-semibold text-foreground">UniMarket / {userName || "Seller"}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              💡 <strong>Instructions:</strong> Open your GTBank, Zenith, Access, Kuda, or PalmPay mobile app. Transfer{" "}
              <strong>₦{amount.toLocaleString()}</strong> to the NUBAN account above, then click confirm below!
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={verifying}
              className="w-full min-h-[48px] text-base font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg rounded-xl"
            >
              {verifying ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Verifying Bank Deposit...</span>
                </div>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  I Have Transferred ₦{amount.toLocaleString()} ⚡
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={verifying}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
