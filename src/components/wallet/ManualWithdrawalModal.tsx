import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { WalletAccount } from "@/services/walletAccountService";
import { requestManualWithdrawal } from "@/services/manualWithdrawalService";
import { ArrowUpRight, CalendarClock, Wallet } from "lucide-react";

interface ManualWithdrawalModalProps {
  userId: string;
  account: WalletAccount;
  open: boolean;
  onClose: () => void;
  onWithdrawalCompleted?: (updatedAccount: WalletAccount) => void;
}

export const ManualWithdrawalModal = ({ userId, account, open, onClose, onWithdrawalCompleted }: ManualWithdrawalModalProps) => {
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleWithdrawal = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount < 100 || amount !== Math.round(amount * 100) / 100) {
      toast({ title: "Invalid amount", description: "Minimum withdrawal amount is ₦100.", variant: "destructive" });
      return;
    }
    if (amount > account.available_balance) {
      toast({ title: "Insufficient balance", description: `You can request up to ₦${account.available_balance.toLocaleString()}.`, variant: "destructive" });
      return;
    }
    if (!bankName.trim() || !accountName.trim() || !/^\d{10}$/.test(accountNumber)) {
      toast({ title: "Check bank details", description: "Enter the bank name, account holder name, and a valid 10-digit account number.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const result = await requestManualWithdrawal(userId, { bankName, accountName, accountNumber, amount });
      if (!result.success) {
        toast({ title: "Withdrawal request not submitted", description: result.message, variant: "destructive" });
        return;
      }
      toast({ title: "Withdrawal request received", description: result.message });
      if (result.account && onWithdrawalCompleted) onWithdrawalCompleted(result.account);
      onClose();
    } catch (error) {
      console.error("Manual withdrawal request error:", error);
      toast({ title: "Withdrawal request not submitted", description: "Please check your balance and try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-flora-ink/10 bg-flora-card text-flora-ink">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold"><ArrowUpRight className="h-5 w-5 text-flora-leaf" />Request withdrawal</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between rounded-xl border border-flora-leaf/25 bg-flora-tagBg/40 p-3.5">
          <div><p className="flex items-center gap-1 text-[11px] font-medium text-flora-tagText"><Wallet className="h-3.5 w-3.5" />Available balance</p><p className="text-xl font-extrabold text-flora-tagText">₦{account.available_balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</p></div>
          <Button type="button" variant="outline" size="sm" onClick={() => setAmountStr(account.available_balance.toString())} className="border-flora-leaf/40 bg-white text-xs text-flora-tagText">Withdraw all</Button>
        </div>
        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />Requests are processed manually within 3 business days. Weekends are not counted.</div>
        <form onSubmit={handleWithdrawal} className="space-y-3.5 pt-1 text-xs">
          <div><Label>Bank name *</Label><Input value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="e.g. Access Bank" maxLength={120} required className="mt-1 border-flora-ink/15 bg-white" /></div>
          <div><Label>Account holder name *</Label><Input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="Name on the bank account" maxLength={160} required className="mt-1 border-flora-ink/15 bg-white" /></div>
          <div><Label>10-digit account number *</Label><Input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ""))} placeholder="e.g. 0123456789" maxLength={10} required className="mt-1 border-flora-ink/15 bg-white font-mono tracking-wider" /></div>
          <div><div className="mb-1 flex items-center justify-between"><Label>Amount (₦) *</Label><span className="text-[10px] text-flora-muted">Min ₦100</span></div><Input type="number" min={100} value={amountStr} onChange={(event) => setAmountStr(event.target.value)} placeholder="Enter amount" required className="border-flora-ink/15 bg-white text-sm font-semibold" /></div>
          <Button type="submit" disabled={submitting || !amountStr} className="mt-2 w-full rounded-full bg-flora-ink py-2.5 text-xs font-bold text-white hover:brightness-110">{submitting ? "Submitting request..." : "Submit withdrawal request"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
