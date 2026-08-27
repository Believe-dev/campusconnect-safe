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
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-100">
            <ArrowUpRight className="h-5 w-5 text-emerald-400" />
            <span>Withdraw Funds to External Bank</span>
          </DialogTitle>
        </DialogHeader>

        {/* Available Balance Box */}
        <div className="bg-emerald-950/40 border border-emerald-800/60 p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" /> Available Wallet Balance
            </p>
            <p className="text-xl font-extrabold text-emerald-300">
              ₦{account.available_balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setMaxAmount}
            className="text-xs bg-emerald-900/60 text-emerald-300 border-emerald-700 hover:bg-emerald-800"
          >
            Withdraw All
          </Button>
        </div>

        <form onSubmit={handleWithdrawal} className="space-y-3.5 pt-1 text-xs">
          <div>
            <Label className="text-slate-300">Destination Bank *</Label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full h-10 px-3 text-xs border border-slate-700 bg-slate-950 text-slate-200 rounded-md mt-1"
            >
              {NIGERIAN_BANKS.map((b) => (
                <option key={b.code} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-slate-300">10-Digit Account Number *</Label>
            <Input
              type="text"
              maxLength={10}
              placeholder="e.g. 0123456789"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              required
              className="font-mono tracking-wider bg-slate-950 border-slate-700 mt-1"
            />
          </div>

          <div>
            <Label className="text-slate-300">Account Holder Full Name *</Label>
            <Input
              type="text"
              placeholder="Enter name on destination bank account"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
              className="bg-slate-950 border-slate-700 mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <Label className="text-slate-300">Amount (₦) *</Label>
              <span className="text-[10px] text-slate-400">Min ₦100</span>
            </div>
            <Input
              type="number"
              min={100}
              placeholder="Enter amount (e.g. 5000)"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              required
              className="bg-slate-950 border-slate-700 text-sm font-semibold"
            />

            {/* Quick Amount Chips */}
            <div className="flex gap-2 mt-2">
              {[1000, 5000, 10000, 25000].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setAmountStr(chip.toString())}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] font-medium"
                >
                  +₦{chip.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Narration / Memo (Optional)</Label>
            <Input
              type="text"
              placeholder="e.g. CampusConnect Sales Payout"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="bg-slate-950 border-slate-700 text-xs mt-1"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting || !amountStr || parseFloat(amountStr) < 100}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs mt-2"
          >
            {submitting ? "Processing Transfer..." : "Transfer Funds to External Bank ↗️"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
