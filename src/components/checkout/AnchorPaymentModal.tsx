import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Building2, CreditCard, Copy, Check, Lock, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnchorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  nubanAccount: string;
  userName: string;
  onConfirmPayment: (channel: "transfer" | "card", cardData?: { cardNumber: string; expiry: string; cvv: string }) => void;
  processing: boolean;
}

export const AnchorPaymentModal: React.FC<AnchorPaymentModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  nubanAccount,
  userName,
  onConfirmPayment,
  processing,
}) => {
  const [payChannel, setPayChannel] = useState<"transfer" | "card">("transfer");
  const [copied, setCopied] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
  });
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
    if (payChannel === "transfer") {
      setVerifyingTransfer(true);
      setTransferStatus("Contacting CoreStep Microfinance / Anchor BaaS system...");
      
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: { user } } = await supabase.auth.getUser();
        const { verifyAnchorBankTransfer } = await import("@/services/anchorBaasService");

        setTimeout(() => {
          setTransferStatus(`Checking incoming transfers for NUBAN Account ${nubanAccount || "Pending..."}...`);
        }, 700);
        
        const res = await verifyAnchorBankTransfer(user?.id || "", nubanAccount, totalAmount);
        if (res.verified) {
          toast({
            title: "Bank Deposit Verified! ✅",
            description: res.message,
          });
          onConfirmPayment("transfer");
        } else {
          toast({
            title: "Transfer Not Found",
            description: "No deposit detected yet. Please ensure you sent the funds and try again.",
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
    } else {
      if (!cardDetails.cardNumber || cardDetails.cardNumber.length < 12) {
        toast({
          title: "Card Required",
          description: "Please enter a valid 16-digit debit card number.",
          variant: "destructive",
        });
        return;
      }
      onConfirmPayment("card", cardDetails);
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
          {/* Payment Method Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => setPayChannel("transfer")}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg font-bold text-sm transition-all ${
                payChannel === "transfer"
                  ? "bg-background text-emerald-700 shadow-sm border border-emerald-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="h-4 w-4 text-emerald-600" />
              Bank Transfer
            </button>
            <button
              type="button"
              onClick={() => setPayChannel("card")}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg font-bold text-sm transition-all ${
                payChannel === "card"
                  ? "bg-background text-emerald-700 shadow-sm border border-emerald-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CreditCard className="h-4 w-4 text-emerald-600" />
              ATM Debit Card
            </button>
          </div>

          {/* Option A: Bank Transfer */}
          {payChannel === "transfer" ? (
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Transfer to Your Anchor Virtual NUBAN
                </span>
                <span className="text-xs text-emerald-600 font-semibold">Instant Deposit</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900 space-y-2.5 shadow-sm">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Bank Name:</span>
                  <span className="font-bold text-foreground">CoreStep Microfinance (Anchor)</span>
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
          ) : (
            /* Option B: ATM Debit Card */
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border rounded-xl space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="modalCardNumber" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ATM Debit Card Number *
                </Label>
                <Input
                  id="modalCardNumber"
                  placeholder="5399 **** **** 1234 (Mastercard / Visa / Verve)"
                  value={cardDetails.cardNumber}
                  onChange={(e) => setCardDetails((prev) => ({ ...prev, cardNumber: e.target.value }))}
                  className="font-mono text-sm h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="modalExpiry" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Expiry Date *
                  </Label>
                  <Input
                    id="modalExpiry"
                    placeholder="12/28"
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails((prev) => ({ ...prev, expiry: e.target.value }))}
                    className="text-sm font-mono h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="modalCvv" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    CVV Security Code *
                  </Label>
                  <Input
                    id="modalCvv"
                    type="password"
                    maxLength={3}
                    placeholder="123"
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails((prev) => ({ ...prev, cvv: e.target.value }))}
                    className="text-sm font-mono h-11"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold pt-1">
                <Shield className="h-4 w-4" />
                <span>256-bit SSL Encrypted Anchor BaaS Payment Gateway</span>
              </div>
            </div>
          )}

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
              ) : payChannel === "transfer" ? (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  I Have Transferred ₦{totalAmount.toLocaleString()} ⚡
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pay ₦{totalAmount.toLocaleString()} with Card 💳
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
