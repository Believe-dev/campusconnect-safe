import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  withdrawToExternalBank,
  AnchorVirtualAccount,
} from "@/services/anchorBaasService";
import { Building2, Send, ArrowUpRight, CheckCircle2, Wallet } from "lucide-react";

interface AnchorWithdrawalModalProps {
  userId: string;
  account: AnchorVirtualAccount;
  open: boolean;
  onClose: () => void;
  onWithdrawalCompleted?: (updatedAcc: AnchorVirtualAccount) => void;
}

const NIGERIAN_BANKS = [
  { name: "Guaranty Trust Bank (GTBank)", code: "058" },
  { name: "Zenith Bank", code: "057" },
  { name: "Access Bank", code: "044" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "United Bank for Africa (UBA)", code: "033" },
  { name: "Kuda Microfinance Bank", code: "50211" },
  { name: "OPay Digital Services", code: "999992" },
  { name: "Moniepoint Microfinance Bank", code: "50515" },
  { name: "PalmPay", code: "999991" },
  { name: "Wema Bank / ALAT", code: "035" },
  { name: "Fidelity Bank", code: "070" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Sterling Bank", code: "232" },
  { name: "CoreStep Microfinance Bank", code: "090365" },
];

export const AnchorWithdrawalModal = ({
  userId,
  account,
  open,
  onClose,
  onWithdrawalCompleted,
}: AnchorWithdrawalModalProps) => {
  const [bankName, setBankName] = useState(NIGERIAN_BANKS[0].name);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [narration, setNarration] = useState("Anchor Wallet Payout");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount < 100) {
      toast({
        title: "Invalid Amount",
        description: "Minimum withdrawal amount is ₦100.",
        variant: "destructive",
      });
      return;
    }

    if (amount > account.available_balance) {
      toast({
        title: "Insufficient Balance",
        description: `Your available balance is ₦${account.available_balance.toLocaleString()}. Requested: ₦${amount.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    if (!accountNumber || accountNumber.length < 10) {
      toast({
        title: "Invalid Account Number",
        description: "Please enter a valid 10-digit NUBAN account number.",
        variant: "destructive",
      });
      return;
    }

    if (!accountName.trim()) {
      toast({
        title: "Account Name Required",
        description: "Please enter the recipient bank account name.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await withdrawToExternalBank(userId, {
        bankName,
        accountNumber,
        accountName,
        amount,
        narration,
      });

      if (res.success) {
        toast({
          title: "Bank Transfer Successful! 🚀",
          description: res.message,
        });
        if (res.account && onWithdrawalCompleted) {
          onWithdrawalCompleted(res.account);
        }
        onClose();
      } else {
        toast({
          title: "Transfer Failed",
          description: res.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Withdrawal error:", err);
      toast({
        title: "Withdrawal Error",
        description: "Something went wrong processing your withdrawal. Please check your wallet balance before retrying.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const setMaxAmount = () => {
    setAmountStr(account.available_balance.toString());
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-flora-card border-flora-ink/10 text-flora-ink">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-flora-ink">
            <ArrowUpRight className="h-5 w-5 text-flora-leaf" />
            <span>Withdraw Funds to External Bank</span>
          </DialogTitle>
        </DialogHeader>

        {/* Available Balance Box */}
        <div className="flex items-center justify-between rounded-xl border border-flora-leaf/25 bg-flora-tagBg/40 p-3.5">
          <div>
            <p className="flex items-center gap-1 text-[11px] font-medium text-flora-tagText">
              <Wallet className="h-3.5 w-3.5" /> Available Wallet Balance
            </p>
            <p className="text-xl font-extrabold text-flora-tagText">
              ₦{account.available_balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setMaxAmount}
            className="border-flora-leaf/40 bg-white text-xs text-flora-tagText hover:bg-flora-tagBg"
          >
            Withdraw All
          </Button>
        </div>

        <form onSubmit={handleWithdrawal} className="space-y-3.5 pt-1 text-xs">
          <div>
            <Label className="text-flora-ink">Destination Bank *</Label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-flora-ink/15 bg-white px-3 text-xs text-flora-ink"
            >
              {NIGERIAN_BANKS.map((b) => (
                <option key={b.code} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-flora-ink">10-Digit Account Number *</Label>
            <Input
              type="text"
              maxLength={10}
              placeholder="e.g. 0123456789"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              required
              className="mt-1 border-flora-ink/15 bg-white font-mono tracking-wider"
            />
          </div>

          <div>
            <Label className="text-flora-ink">Account Holder Full Name *</Label>
            <Input
              type="text"
              placeholder="Enter name on destination bank account"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
              className="mt-1 border-flora-ink/15 bg-white"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label className="text-flora-ink">Amount (₦) *</Label>
              <span className="text-[10px] text-flora-muted">Min ₦100</span>
            </div>
            <Input
              type="number"
              min={100}
              placeholder="Enter amount (e.g. 5000)"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              required
              className="border-flora-ink/15 bg-white text-sm font-semibold"
            />

            {/* Quick Amount Chips */}
            <div className="mt-2 flex gap-2">
              {[1000, 5000, 10000, 25000].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setAmountStr(chip.toString())}
                  className="rounded-full border border-flora-ink/15 bg-flora-chip px-2 py-1 text-[10px] font-medium text-flora-ink hover:brightness-95"
                >
                  +₦{chip.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-flora-ink">Narration / Memo (Optional)</Label>
            <Input
              type="text"
              placeholder="e.g. UniMarket Sales Payout"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="mt-1 border-flora-ink/15 bg-white text-xs"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting || !amountStr || parseFloat(amountStr) < 100}
            className="mt-2 w-full rounded-full bg-flora-ink py-2.5 text-xs font-bold text-white hover:brightness-110"
          >
            {submitting ? "Processing Transfer..." : "Transfer Funds to External Bank ↗️"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
