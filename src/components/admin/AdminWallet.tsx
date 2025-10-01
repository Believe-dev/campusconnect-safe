import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Process withdrawal via Paystack
      const { data, error } = await supabase.functions.invoke('process-admin-payout', {
        body: {
          amount: amount,
          bank_name: withdrawalForm.bankName,
          account_number: withdrawalForm.accountNumber,
          account_name: withdrawalForm.accountName,
          admin_id: user.id,
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
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{walletData.totalCommissions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₦{walletData.availableBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Ready to withdraw</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawn</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{walletData.totalWithdrawn.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Lifetime withdrawals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{walletData.monthlyCommissions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Monthly commissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Commission Withdrawals</CardTitle>
            <div className="flex gap-2">
              <Button onClick={fetchWalletData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
                <DialogTrigger asChild>
                  <Button disabled={walletData.availableBalance <= 0}>
                    <Wallet className="h-4 w-4 mr-2" />
                    Withdraw Funds
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Withdraw Commission Funds</DialogTitle>
                    <DialogDescription>
                      Transfer your commission earnings to your bank account
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span>Available Balance:</span>
                        <span className="font-bold text-green-600">
                          ₦{walletData.availableBalance.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                      <Select
                        value={withdrawalForm.bankName}
                        onValueChange={(value) => setWithdrawalForm(prev => ({ ...prev, bankName: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your bank" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Access Bank">Access Bank</SelectItem>
                          <SelectItem value="Citibank Nigeria">Citibank Nigeria</SelectItem>
                          <SelectItem value="Diamond Bank">Diamond Bank</SelectItem>
                          <SelectItem value="Ecobank Nigeria">Ecobank Nigeria</SelectItem>
                          <SelectItem value="Fidelity Bank">Fidelity Bank</SelectItem>
                          <SelectItem value="First Bank of Nigeria">First Bank of Nigeria</SelectItem>
                          <SelectItem value="First City Monument Bank">First City Monument Bank</SelectItem>
                          <SelectItem value="Guaranty Trust Bank">Guaranty Trust Bank</SelectItem>
                          <SelectItem value="Heritage Bank">Heritage Bank</SelectItem>
                          <SelectItem value="Keystone Bank">Keystone Bank</SelectItem>
                          <SelectItem value="Polaris Bank">Polaris Bank</SelectItem>
                          <SelectItem value="Providus Bank">Providus Bank</SelectItem>
                          <SelectItem value="Stanbic IBTC Bank">Stanbic IBTC Bank</SelectItem>
                          <SelectItem value="Standard Chartered Bank">Standard Chartered Bank</SelectItem>
                          <SelectItem value="Sterling Bank">Sterling Bank</SelectItem>
                          <SelectItem value="Union Bank of Nigeria">Union Bank of Nigeria</SelectItem>
                          <SelectItem value="United Bank For Africa">United Bank For Africa</SelectItem>
                          <SelectItem value="Unity Bank">Unity Bank</SelectItem>
                          <SelectItem value="Wema Bank">Wema Bank</SelectItem>
                          <SelectItem value="Zenith Bank">Zenith Bank</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleWithdrawal} disabled={withdrawing}>
                        {withdrawing ? 'Processing...' : 'Withdraw Funds'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {withdrawalHistory.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No withdrawals yet</h3>
              <p className="text-muted-foreground">
                Your withdrawal history will appear here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transfer Code</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawalHistory.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-medium">
                        ₦{withdrawal.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.bank_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {withdrawal.account_number} - {withdrawal.account_name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            withdrawal.status === 'completed' ? 'default' :
                            withdrawal.status === 'processing' ? 'secondary' :
                            withdrawal.status === 'failed' ? 'destructive' : 'outline'
                          }
                        >
                          {withdrawal.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {withdrawal.transfer_code ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {withdrawal.transfer_code}
                          </code>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">
                            {new Date(withdrawal.created_at).toLocaleDateString()}
                          </p>
                          {withdrawal.processed_at && (
                            <p className="text-xs text-muted-foreground">
                              Processed: {new Date(withdrawal.processed_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};