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

interface AnchorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  orderId: string;
  nubanAccount: string;
  bankName?: string;
  userName: string;
  onConfirmPayment: (channel: "transfer") => void;
  processing: boolean;
}

export const AnchorPaymentModal: React.FC<AnchorPaymentModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  orderId,
  nubanAccount,
  bankName,
  userName,
  onConfirmPayment,
  processing,
}) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const [verifyingTransfer, setVerifyingTransfer] = useState(false);
  const [transferStatus, setTransferStatus] = useState<string | null>(null);

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
    setVerifyingTransfer(true);
    setTransferStatus("Contacting CoreStep Microfinance / Anchor BaaS system...");

    try {
      const { verifyAnchorBankTransfer } = await import("@/services/anchorBaasService");

      setTimeout(() => {
        setTransferStatus(`Checking incoming transfers for NUBAN Account ${nubanAccount || "Pending..."}...`);
      }, 700);

      const res = await verifyAnchorBankTransfer(orderId);
      if (res.verified) {
        toast({
          title: "Bank Deposit Verified! ✅",
          description: res.message,
        });
        onConfirmPayment("transfer");
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
      setVerifyingTransfer(false);
      setTransferStatus(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-2 border-emerald-500/30">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Badge className="bg-white/20 text-white hover:bg-white/30 border-0 font-medium">
              <Shield className="h-3.5 w-3.5 mr-1" />
              100% Escrow Protected
            </Badge>
            <span className="text-xs font-mono text-emerald-100 uppercase tracking-widest">Anchor BaaS</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-white mb-1">
            Choose Payment Method
          </DialogTitle>
          <DialogDescription className="text-emerald-100 text-sm">
            Total Amount Due: <strong className="text-white text-lg font-bold">₦{totalAmount.toLocaleString()}</strong>
          </DialogDescription>
        </div>

        <div className="p-6 space-y-5">
          {/* Card payment is disabled: there is no real card gateway wired up (no card
              collection or verification ever happened here), so it's fail-safe disabled
              rather than left accepting any 12+ digit number as a successful payment. */}
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Transfer to This Order's Anchor Sub-Ledger Account
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
                <span className="font-semibold text-foreground">CampusConnect / {userName || "Buyer"}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              💡 <strong>Instructions:</strong> Open your GTBank, Zenith, Access, Kuda, or PalmPay mobile app. Transfer <strong>₦{totalAmount.toLocaleString()}</strong> to the NUBAN account above, then click confirm below!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={processing || verifyingTransfer}
              className="w-full min-h-[48px] text-base font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg rounded-xl"
            >
              {verifyingTransfer ? (
                <div className="flex flex-col items-center gap-1 py-1">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Verifying Bank Deposit...</span>
                  </div>
                  {transferStatus && (
                    <span className="text-[11px] font-normal text-emerald-100 animate-pulse">
                      {transferStatus}
                    </span>
                  )}
                </div>
              ) : processing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Processing Order...
                </div>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  I Have Transferred ₦{totalAmount.toLocaleString()} ⚡
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={processing}
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
