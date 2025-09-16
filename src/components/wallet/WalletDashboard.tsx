import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Wallet, TrendingUp, DollarSign, CreditCard, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';

interface WalletData {
  id: string;
  available_balance: number;
  pending_balance: number;
  total_earnings: number;
  total_commission_paid: number;
}

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  status: string;
}

interface PayoutRequest {
  id: string;
  amount: number;
  bank_account_name: string;
  bank_name: string;
  status: string;
  created_at: string;
  admin_notes?: string;
}

const WalletDashboard = () => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const { toast } = useToast();

  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_name: ''
  });

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch wallet
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError && walletError.code !== 'PGRST116') throw walletError;

      if (walletData) {
        setWallet(walletData);
      }

      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);

      // Fetch payout requests
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (payoutsError) throw payoutsError;
      setPayoutRequests(payoutsData || []);

    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast({
        title: "Error",
        description: "Failed to load wallet data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutRequest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !wallet) return;

      const amount = parseFloat(payoutForm.amount);
      if (amount <= 0 || amount > wallet.available_balance) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid amount within your available balance",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('payout_requests')
        .insert({
          user_id: user.id,
          wallet_id: wallet.id,
          amount,
          bank_account_name: payoutForm.bank_account_name,
          bank_account_number: payoutForm.bank_account_number,
          bank_name: payoutForm.bank_name
        });

      if (error) throw error;

      toast({
        title: "Payout Requested",
        description: "Your payout request has been submitted for processing",
      });

      setShowPayoutDialog(false);
      setPayoutForm({
        amount: '',
        bank_account_name: '',
        bank_account_number: '',
        bank_name: ''
      });
      fetchWalletData();

    } catch (error) {
      console.error('Error requesting payout:', error);
      toast({
        title: "Error",
        description: "Failed to submit payout request",
        variant: "destructive",
      });
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit': return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 'debit': return <ArrowDownLeft className="h-4 w-4 text-red-600" />;
      case 'commission': return <DollarSign className="h-4 w-4 text-orange-600" />;
      case 'payout': return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'refund': return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      processing: 'outline',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'secondary'
    } as const;

    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Wallet Dashboard</h2>
        <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
          <DialogTrigger asChild>
            <Button disabled={!wallet || wallet.available_balance <= 0}>
              <CreditCard className="h-4 w-4 mr-2" />
              Request Payout
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Payout</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Available Balance: ₦{wallet?.available_balance.toLocaleString() || 0}</Label>
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={payoutForm.amount}
                  onChange={(e) => setPayoutForm({...payoutForm, amount: e.target.value})}
                  max={wallet?.available_balance || 0}
                />
              </div>
              <div>
                <Label htmlFor="bank_account_name">Account Name</Label>
                <Input
                  id="bank_account_name"
                  placeholder="Full name on account"
                  value={payoutForm.bank_account_name}
                  onChange={(e) => setPayoutForm({...payoutForm, bank_account_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="bank_account_number">Account Number</Label>
                <Input
                  id="bank_account_number"
                  placeholder="Bank account number"
                  value={payoutForm.bank_account_number}
                  onChange={(e) => setPayoutForm({...payoutForm, bank_account_number: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  placeholder="Bank name"
                  value={payoutForm.bank_name}
                  onChange={(e) => setPayoutForm({...payoutForm, bank_name: e.target.value})}
                />
              </div>
              <Button onClick={handlePayoutRequest} className="w-full">
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{wallet?.available_balance.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Ready for withdrawal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{wallet?.total_earnings.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{wallet?.total_commission_paid.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Platform fees</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Transactions and Payouts */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="payouts">Payout Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">No transactions yet</p>
                  <p className="text-muted-foreground">Your transaction history will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          transaction.type === 'credit' || transaction.type === 'refund' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {transaction.type === 'credit' || transaction.type === 'refund' ? '+' : '-'}
                          ₦{transaction.amount.toLocaleString()}
                        </p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Payout Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {payoutRequests.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">No payout requests</p>
                  <p className="text-muted-foreground">Your payout requests will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payoutRequests.map((payout) => (
                    <div key={payout.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-lg">₦{payout.amount.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {payout.bank_account_name} • {payout.bank_name}
                          </p>
                        </div>
                        {getStatusBadge(payout.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Requested on {new Date(payout.created_at).toLocaleDateString()}
                      </p>
                      {payout.admin_notes && (
                        <p className="text-sm mt-2 p-2 bg-muted rounded">
                          <strong>Admin Notes:</strong> {payout.admin_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WalletDashboard;