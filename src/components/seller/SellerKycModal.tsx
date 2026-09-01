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
  fetchCbnKycStatusFromDb,
  submitSellerKyc,
  CbnKycTierDetails,
} from "@/services/anchorBaasService";
import {
  ShieldCheck,
  CheckCircle,
  Clock,
  XCircle,
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
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [idCategory, setIdCategory] = useState<"bvn" | "nin">("bvn");
  const [bvnOrNin, setBvnOrNin] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"M" | "F" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const loadKyc = useCallback(async () => {
    if (!userId) return;
    setLoadingStatus(true);
    const status = await fetchCbnKycStatusFromDb(userId);
    setKycStatus(status);
    if (status.bvn_or_nin) {
      setBvnOrNin(status.bvn_or_nin);
    }
    setLoadingStatus(false);
  }, [userId]);

  useEffect(() => {
    if (open) {
      loadKyc();
    }
  }, [open, loadKyc]);

  const handleDigitalVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bvnOrNin || bvnOrNin.length !== 11) {
      toast({
        title: "Invalid Input",
        description: `Please enter a valid 11-digit ${idCategory.toUpperCase()} number.`,
        variant: "destructive",
      });
      return;
    }
    if (!dateOfBirth || !gender) {
      toast({
        title: "Missing Details",
        description: "Date of birth and gender are required to match your BVN/NIN record.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitSellerKyc({ bvnOrNin, dateOfBirth, gender });

      if (res.success || res.status === "pending") {
        toast({
          title: "Submitted for Verification",
          description: res.message,
        });
        await loadKyc();
      } else {
        toast({
          title: "Verification Failed",
          description: res.message,
          variant: "destructive",
        });
        await loadKyc();
      }
    } catch (err) {
      console.error("Digital KYC failed:", err);
      toast({
        title: "Error",
        description: "Something went wrong submitting your verification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStatus || !kycStatus) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-flora-card border-flora-ink/10 text-flora-ink">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-flora-leaf" />
              <span>Identity Verification (KYC)</span>
            </div>
            <Badge
              variant="outline"
              className={
                kycStatus.kyc_status === "verified"
                  ? "bg-flora-tagBg text-flora-tagText border-flora-leaf/40 text-[10px]"
                  : kycStatus.kyc_status === "pending"
                  ? "bg-amber-50 text-amber-700 border-amber-300 text-[10px]"
                  : kycStatus.kyc_status === "rejected"
                  ? "bg-red-50 text-red-700 border-red-300 text-[10px]"
                  : "bg-flora-chip text-flora-muted border-flora-ink/15 text-[10px]"
              }
            >
              {kycStatus.kyc_status || "unverified"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          {kycStatus.kyc_status === "verified" ? (
            /* Verified state */
            <div className="space-y-4 text-center py-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-flora-tagBg border-2 border-flora-leaf flex items-center justify-center text-flora-leaf">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-flora-ink">Identity Verified</h4>
                <p className="text-xs text-flora-muted mt-1">
                  Confirmed by Anchor BaaS (<span className="text-flora-tagText font-mono font-semibold">{kycStatus.bvn_or_nin}</span>)
                </p>
              </div>

              <div className="bg-flora-chip border border-flora-ink/10 p-3.5 rounded-xl text-left space-y-2">
                <div className="flex justify-between border-b border-flora-ink/10 pb-1.5">
                  <span className="text-flora-muted">Single Deposit Limit:</span>
                  <span className="font-bold text-flora-tagText">₦{kycStatus.single_deposit_limit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-flora-ink/10 pb-1.5">
                  <span className="text-flora-muted">Daily Transfer Limit:</span>
                  <span className="font-bold text-flora-tagText">₦{kycStatus.daily_limit.toLocaleString()} / day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-flora-muted">Wallet Balance Cap:</span>
                  <span className="font-bold text-flora-tagText">₦{kycStatus.max_balance_limit.toLocaleString()}</span>
                </div>
              </div>

              <Button
                onClick={onClose}
                className="w-full bg-flora-ink hover:brightness-110 text-white font-bold"
              >
                Close & Return
              </Button>
            </div>
          ) : kycStatus.kyc_status === "pending" ? (
            /* Pending state - awaiting Anchor's async result via webhook */
            <div className="space-y-4 text-center py-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 border-2 border-amber-400 flex items-center justify-center text-amber-500">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-bold text-flora-ink">Verification In Progress</h4>
                <p className="text-xs text-flora-muted mt-1">
                  Your details were submitted to Anchor BaaS and are being verified. This is usually confirmed
                  within a few moments - check back shortly.
                </p>
              </div>
              <Button
                onClick={loadKyc}
                variant="outline"
                className="w-full border-flora-ink/15 text-flora-ink hover:bg-flora-chip"
              >
                Refresh Status
              </Button>
            </div>
          ) : (
            /* Unverified / rejected - show the form */
            <form onSubmit={handleDigitalVerification} className="space-y-4">
              {kycStatus.kyc_status === "rejected" && (
                <Alert className="bg-red-50 border-red-200 text-red-700">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-xs">
                    <strong>Previous submission was not approved:</strong>{" "}
                    {kycStatus.kyc_rejection_reason || "Please check your details and resubmit."}
                  </AlertDescription>
                </Alert>
              )}

              <Alert className="bg-flora-chip border-flora-ink/10 text-flora-ink">
                <ShieldCheck className="h-4 w-4 text-flora-leaf" />
                <AlertDescription className="text-xs">
                  <strong>Real-time Verification:</strong> Your BVN or NIN is submitted directly to Anchor BaaS and
                  screened against sanctions watchlists before your account can receive escrow funds.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label className="text-flora-ink">Choose Identity Method *</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-flora-ink">
                    <input
                      type="radio"
                      name="idMethod"
                      checked={idCategory === "bvn"}
                      onChange={() => setIdCategory("bvn")}
                      className="accent-flora-leaf"
                    />
                    Bank Verification Number (BVN)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-flora-ink">
                    <input
                      type="radio"
                      name="idMethod"
                      checked={idCategory === "nin"}
                      onChange={() => setIdCategory("nin")}
                      className="accent-flora-leaf"
                    />
                    National Identity Number (NIN)
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="digitalIdInput" className="text-flora-ink">
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
                  className="font-mono tracking-wider bg-white border-flora-ink/15 text-sm mt-1"
                />
                <p className="text-[10px] text-flora-muted mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-flora-muted" />
                  Dial *565*0# (BVN) or *346# (NIN) if you don't know your number.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dob" className="text-flora-ink">Date of Birth *</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                    className="bg-white border-flora-ink/15 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="gender" className="text-flora-ink">Gender *</Label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "M" | "F" | "")}
                    required
                    className="w-full h-10 mt-1 px-3 text-sm rounded-md bg-white border border-flora-ink/15 text-flora-ink"
                  >
                    <option value="">Select</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
              </div>

              <p className="text-[10px] text-flora-muted">
                Must match the name and phone number on your account exactly as registered with your BVN/NIN.
              </p>

              <Button
                type="submit"
                disabled={submitting || bvnOrNin.length !== 11}
                className="w-full bg-flora-ink hover:brightness-110 text-white font-bold py-2.5"
              >
                {submitting ? "Submitting to Anchor..." : "Verify with Anchor BaaS"}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
