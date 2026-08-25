import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  getCbnKycStatus,
  submitSellerKyc,
  CbnKycTierDetails,
} from "@/services/anchorBaasService";
import {
  ShieldCheck,
  Building2,
  CheckCircle,
  AlertCircle,
  Zap,
  Lock,
} from "lucide-react";

interface SellerKycModalProps {
  userId: string;
  open: boolean;
  onClose: () => void;
  onKycCompleted?: (tier: CbnKycTierDetails) => void;
}

export const SellerKycModal = ({
  userId,
  open,
  onClose,
  onKycCompleted,
}: SellerKycModalProps) => {
  const [kycStatus, setKycStatus] = useState<CbnKycTierDetails | null>(null);
  const [idCategory, setIdCategory] = useState<"bvn" | "nin">("bvn");
  const [bvnOrNin, setBvnOrNin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const loadKyc = useCallback(() => {
    if (!userId) return;
    const status = getCbnKycStatus(userId);
    setKycStatus(status);
    if (status.bvn_or_nin) {
      setBvnOrNin(status.bvn_or_nin);
    }
  }, [userId]);

  useEffect(() => {
    if (open) {
      loadKyc();
    }
  }, [open, loadKyc]);

  const handleDigitalVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bvnOrNin || bvnOrNin.length < 11) {
      toast({
        title: "Invalid Input",
        description: `Please enter a valid 11-digit ${idCategory.toUpperCase()} number.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      // Instant Digital API Verification via Anchor BaaS
      const res = await submitSellerKyc(userId, {
        bvnOrNin,
        idType: idCategory,
        idNumber: bvnOrNin,
      });

      if (res.success) {
        setKycStatus(res.tier);
        toast({
          title: "Digital Verification Complete! ⚡",
          description: `Identity verified via Anchor BaaS. Your CBN ${res.tier.tier_name} NUBAN is active!`,
        });
        if (onKycCompleted) onKycCompleted(res.tier);
      } else {
        toast({
          title: "Verification Failed",
          description: res.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Digital KYC failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!kycStatus) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              <span>Instant Digital Identity Verification</span>
            </div>
            <Badge
              variant="outline"
              className={
                kycStatus.tier >= 2
                  ? "bg-emerald-950 text-emerald-300 border-emerald-500 text-[10px]"
                  : "bg-amber-950 text-amber-300 border-amber-500 text-[10px]"
              }
            >
              {kycStatus.tier_name}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          {/* Status Banner */}
          <Alert className="bg-slate-950 border-slate-800 text-slate-200">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <AlertDescription className="text-xs">
              <strong>100% Paperless & Instant:</strong> Type your 11-digit BVN or NIN. Anchor BaaS validates your identity digitally in real-time with zero file uploads!
            </AlertDescription>
          </Alert>

          {kycStatus.tier >= 2 ? (
            /* Verified Digital State */
            <div className="space-y-4 text-center py-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-100">Digital Identity Verified</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Verified via Anchor BaaS (<span className="text-emerald-400 font-mono font-semibold">{kycStatus.bvn_or_nin}</span>)
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-left space-y-2">
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Single Deposit Limit:</span>
                  <span className="font-bold text-emerald-400">₦{kycStatus.single_deposit_limit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Daily Transfer Limit:</span>
                  <span className="font-bold text-emerald-400">₦{kycStatus.daily_limit.toLocaleString()} / day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Wallet Balance Cap:</span>
                  <span className="font-bold text-emerald-400">Unlimited</span>
                </div>
              </div>

              <Button
                onClick={onClose}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Close & Return
              </Button>
            </div>
          ) : (
            /* Unverified Form State */
            <form onSubmit={handleDigitalVerification} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Choose Digital Identity Method *</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="idMethod"
                      checked={idCategory === "bvn"}
                      onChange={() => setIdCategory("bvn")}
                      className="accent-emerald-500"
                    />
                    Bank Verification Number (BVN)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="idMethod"
                      checked={idCategory === "nin"}
                      onChange={() => setIdCategory("nin")}
                      className="accent-emerald-500"
                    />
                    National Identity Number (NIN)
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="digitalIdInput" className="text-slate-300">
                  11-Digit {idCategory.toUpperCase()} Number *
                </Label>
                <Input
                  id="digitalIdInput"
                  type="text"
                  maxLength={11}
                  placeholder={`Enter 11-digit ${idCategory.toUpperCase()}`}
                  value={bvnOrNin}
                  onChange={(e) => setBvnOrNin(e.target.value.replace(/\D/g, ""))}
                  required
                  className="font-mono tracking-wider bg-slate-950 border-slate-700 text-sm mt-1"
                />
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  Anchor BaaS verifies your identity instantly with CBN. Dial *565*0# (BVN) or *346# (NIN).
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting || bvnOrNin.length < 11}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5"
              >
                {submitting ? "Verifying with Anchor..." : "Verify Digitally & Activate NUBAN ⚡"}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
