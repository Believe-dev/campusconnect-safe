import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Wallet, DollarSign, Download, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AdminWalletData {
  totalCommissions: number;
  availableBalance: number;
  totalWithdrawn: number;
  monthlyCommissions: number;
}

interface WithdrawalHistory {
  id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  transfer_code?: string;
  paystack_reference?: string;
  created_at: string;
  processed_at: string | null;
}

const withdrawalStatusClasses = (status: string) => {
  if (status === 'completed') return 'bg-flora-leaf/15 text-flora-leaf';
  if (status === 'processing') return 'bg-amber-100 text-amber-700';
  if (status === 'failed') return 'bg-red-100 text-red-600';
  return 'bg-flora-chip text-flora-ink';
};

export const AdminWallet = () => {
  const [walletData, setWalletData] = useState<AdminWalletData>({
    totalCommissions: 0,
    availableBalance: 0,
    totalWithdrawn: 0,
    monthlyCommissions: 0,
  });
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  // Remove useToast hook since we're using sonner

  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  });

  useEffect(() => {
    fetchWalletData();
    fetchWithdrawalHistory();
  }, []);

  const fetchWalletData = async () => {
    try {
      // Get admin wallet data
      const { data: adminWallet, error: walletError } = await supabase
        .from('admin_wallet')
        .select('*')
        .single();

      if (walletError) throw walletError;

      // Get current month commissions from escrow transactions
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const { data: monthlyEscrows, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('commission_amount, released_at')
        .eq('status', 'released')
        .gte('released_at', new Date(currentYear, currentMonth, 1).toISOString())
        .lt('released_at', new Date(currentYear, currentMonth + 1, 1).toISOString());

      if (escrowError) throw escrowError;

      const monthlyCommissions = monthlyEscrows?.reduce((sum, escrow) => sum + (escrow.commission_amount || 0), 0) || 0;

      setWalletData({
        totalCommissions: adminWallet.total_commissions || 0,
        availableBalance: adminWallet.available_balance || 0,
        totalWithdrawn: adminWallet.total_withdrawn || 0,
        monthlyCommissions,
      });
    } catch (error) {
      console.error('Wallet data fetch error:', error);
      toast.error('Failed to fetch wallet data');
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawalHistory = async () => {
    try {
      const { data: withdrawals, error } = await supabase
        .from('admin_withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawalHistory(withdrawals || []);
    } catch (error) {
      console.error('Withdrawal history fetch error:', error);
      toast.error('Failed to fetch withdrawal history');
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawalForm.amount || !withdrawalForm.bankName || !withdrawalForm.accountNumber || !withdrawalForm.accountName) {
      toast.error('Please fill in all withdrawal details');
      return;
    }

    const amount = parseFloat(withdrawalForm.amount);
    if (amount <= 0 || amount > walletData.availableBalance) {
      toast.error('Please enter a valid withdrawal amount');
      return;
    }

    if (amount < 100) {
      toast.error('Minimum withdrawal amount is ₦100');
      return;
    }

    setWithdrawing(true);
    try {
      // Process withdrawal via Anchor BaaS. The edge function derives the
      // admin's identity from the request's own auth token - it doesn't
      // trust a client-supplied id.
      const { data, error } = await supabase.functions.invoke('process-admin-payout', {
        body: {
          amount: amount,
          bank_name: withdrawalForm.bankName,
          account_number: withdrawalForm.accountNumber,
          account_name: withdrawalForm.accountName,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`₦${amount.toLocaleString()} has been transferred successfully! Transfer code: ${data.transfer_code}`);

        setWithdrawalForm({
          amount: '',
          bankName: '',
          accountNumber: '',
          accountName: '',
        });
        setShowWithdrawDialog(false);
        fetchWalletData();
        fetchWithdrawalHistory();
      } else {
        throw new Error(data?.error || 'Withdrawal failed');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error(error.message || 'Failed to process withdrawal');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-flora-card p-6 shadow-card">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded-full bg-flora-chip"></div>
          <div className="h-32 rounded-2xl bg-flora-chip"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-3xl bg-flora-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flora-chip text-flora-ink">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-flora-ink">₦{walletData.totalCommissions.toLocaleString()}</div>
          <p className="text-sm font-medium text-flora-muted">Total Commissions</p>
          <p className="text-xs text-flora-muted">All time earnings</p>
        </div>

        <div className="rounded-3xl bg-flora-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flora-chip text-flora-ink">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-flora-leaf">₦{walletData.availableBalance.toLocaleString()}</div>
          <p className="text-sm font-medium text-flora-muted">Available Balance</p>
          <p className="text-xs text-flora-muted">Ready to withdraw</p>
        </div>

        <div className="rounded-3xl bg-flora-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flora-chip text-flora-ink">
              <Download className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-flora-ink">₦{walletData.totalWithdrawn.toLocaleString()}</div>
          <p className="text-sm font-medium text-flora-muted">Total Withdrawn</p>
          <p className="text-xs text-flora-muted">Lifetime withdrawals</p>
        </div>

        <div className="rounded-3xl bg-flora-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flora-chip text-flora-ink">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-flora-ink">₦{walletData.monthlyCommissions.toLocaleString()}</div>
          <p className="text-sm font-medium text-flora-muted">This Month</p>
          <p className="text-xs text-flora-muted">Monthly commissions</p>
        </div>
      </div>

      {/* Withdrawal Section */}
      <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-flora-ink">Commission Withdrawals</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={fetchWalletData}
              className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-4 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  disabled={walletData.availableBalance <= 0}
                  className="inline-flex items-center gap-2 rounded-full bg-flora-ink px-4 py-1.5 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Wallet className="h-4 w-4" />
                  Withdraw Funds
                </button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-flora-ink">Withdraw Commission Funds</DialogTitle>
                  <DialogDescription className="text-flora-muted">
                    Transfer your commission earnings to your bank account
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="rounded-2xl bg-flora-chip/40 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-flora-ink">Available Balance:</span>
                      <span className="font-bold text-flora-leaf">
                        ₦{walletData.availableBalance.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-flora-muted">
                      <AlertCircle className="h-4 w-4" />
                      <span>Minimum withdrawal: ₦100</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="amount">Withdrawal Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={withdrawalForm.amount}
                      onChange={(e) => setWithdrawalForm(prev => ({ ...prev, amount: e.target.value }))}
                      max={walletData.availableBalance}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bankName">Bank Name</Label>
                    <select
                      value={withdrawalForm.bankName}
                      onChange={(e) => setWithdrawalForm(prev => ({ ...prev, bankName: e.target.value }))}
                      className="w-full h-10 border border-flora-ink/15 bg-white px-3 py-2 text-sm rounded-md"
                    >
                      <option value="">Select your bank</option>
                      <option value="Access Bank">Access Bank</option>
                      <option value="Citibank Nigeria">Citibank Nigeria</option>
                      <option value="Diamond Bank">Diamond Bank</option>
                      <option value="Ecobank Nigeria">Ecobank Nigeria</option>
                      <option value="Fidelity Bank">Fidelity Bank</option>
                      <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                      <option value="First City Monument Bank">First City Monument Bank</option>
                      <option value="Guaranty Trust Bank">Guaranty Trust Bank</option>
                      <option value="Heritage Bank">Heritage Bank</option>
                      <option value="Keystone Bank">Keystone Bank</option>
                      <option value="Polaris Bank">Polaris Bank</option>
                      <option value="Providus Bank">Providus Bank</option>
                      <option value="Stanbic IBTC Bank">Stanbic IBTC Bank</option>
                      <option value="Standard Chartered Bank">Standard Chartered Bank</option>
                      <option value="Sterling Bank">Sterling Bank</option>
                      <option value="Union Bank of Nigeria">Union Bank of Nigeria</option>
                      <option value="United Bank For Africa">United Bank For Africa</option>
                      <option value="Unity Bank">Unity Bank</option>
                      <option value="Wema Bank">Wema Bank</option>
                      <option value="Zenith Bank">Zenith Bank</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      placeholder="Enter 10-digit account number"
                      value={withdrawalForm.accountNumber}
                      onChange={(e) => setWithdrawalForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      placeholder="Enter account holder name"
                      value={withdrawalForm.accountName}
                      onChange={(e) => setWithdrawalForm(prev => ({ ...prev, accountName: e.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowWithdrawDialog(false)}
                      className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-4 py-2 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleWithdrawal}
                      disabled={withdrawing}
                      className="inline-flex items-center gap-2 rounded-full bg-flora-ink px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {withdrawing ? 'Processing...' : 'Withdraw Funds'}
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {withdrawalHistory.length === 0 ? (
          <div className="py-8 text-center">
            <Wallet className="mx-auto mb-4 h-12 w-12 text-flora-muted" />
            <h3 className="mb-2 text-lg font-semibold text-flora-ink">No withdrawals yet</h3>
            <p className="text-flora-muted">
              Your withdrawal history will appear here
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-flora-ink/10">
            <Table>
              <TableHeader>
                <TableRow className="bg-flora-chip/40 hover:bg-flora-chip/40">
                  <TableHead className="text-flora-ink">Amount</TableHead>
                  <TableHead className="text-flora-ink">Bank Details</TableHead>
                  <TableHead className="text-flora-ink">Status</TableHead>
                  <TableHead className="text-flora-ink">Transfer Code</TableHead>
                  <TableHead className="text-flora-ink">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawalHistory.map((withdrawal) => (
                  <TableRow key={withdrawal.id} className="hover:bg-flora-chip/20">
                    <TableCell className="font-medium text-flora-ink">
                      ₦{withdrawal.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-flora-ink">{withdrawal.bank_name}</p>
                      <p className="text-sm text-flora-muted">
                        {withdrawal.account_number} - {withdrawal.account_name}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${withdrawalStatusClasses(withdrawal.status)}`}>
                        {withdrawal.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {withdrawal.transfer_code ? (
                        <code className="rounded-full bg-flora-chip px-2 py-1 text-xs text-flora-ink">
                          {withdrawal.transfer_code}
                        </code>
                      ) : (
                        <span className="text-sm text-flora-muted">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-flora-ink">
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                      </p>
                      {withdrawal.processed_at && (
                        <p className="text-xs text-flora-muted">
                          Processed: {new Date(withdrawal.processed_at).toLocaleDateString()}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};
