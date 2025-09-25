import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wallet as WalletIcon, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';

interface WalletTransaction {
  id: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  description: string;
  created_at: string;
}

interface Wallet {
  available_balance: number;
}

interface BankDetails {
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
}

const Wallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [bankForm, setBankForm] = useState({
    email: '',
    password: '',
    accountName: '',
    accountNumber: '',
    bankName: ''
  });

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user]);

  const fetchWalletData = async () => {
    if (!user) return;

    try {
      // Fetch wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('id, available_balance')
        .eq('user_id', user.id)
        .single();

      if (walletError && !walletError.message.includes('No rows')) {
        throw walletError;
      }

      const wallet = walletData ? { available_balance: walletData.available_balance } : { available_balance: 0 };
      setWallet(wallet);

      // Fetch bank details
      const { data: profileData } = await supabase
        .from('profiles')
        .select('bank_account_name, bank_account_number, bank_name')
        .eq('user_id', user.id)
        .single();

      setBankDetails(profileData || { bank_account_name: null, bank_account_number: null, bank_name: null });

      // Fetch recent transactions
      if (walletData?.id) {
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', walletData.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (transactionsError && !transactionsError.message.includes('No rows')) {
          throw transactionsError;
        }

        const mappedTransactions = (transactionsData || []).map(t => ({
          id: t.id,
          amount: t.amount,
          transaction_type: t.type === 'credit' ? 'credit' as const : 'debit' as const,
          description: t.description,
          created_at: t.created_at
        }));
        setTransactions(mappedTransactions);
      }
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const updateBankDetails = async () => {
    try {
      const { data, error } = await supabase.rpc('update_bank_details', {
        user_email: bankForm.email,
        user_password: bankForm.password,
        account_name: bankForm.accountName,
        account_number: bankForm.accountNumber,
        bank_name: bankForm.bankName
      });

      if (error || !data) {
        toast.error('Failed to update bank details. Please check your credentials.');
        return;
      }

      toast.success('Bank details updated successfully!');
      setShowBankDialog(false);
      setBankForm({ email: '', password: '', accountName: '', accountNumber: '', bankName: '' });
      fetchWalletData();
    } catch (error) {
      toast.error('Failed to update bank details');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <WalletIcon className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-primary">My Wallet</h1>
          </div>

          {/* Wallet Balance */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Current Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                ₦{wallet?.available_balance?.toLocaleString() || '0.00'}
              </div>
              <p className="text-muted-foreground mt-2">
                Available for withdrawal
              </p>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Bank Details
              </CardTitle>
              <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    {bankDetails?.bank_account_name ? 'Update' : 'Add'} Bank Details
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Bank Details</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      Security Verification Required
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Please enter your UniMarket account email and password to verify your identity before updating bank details.
                    </p>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Your UniMarket Account Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your UniMarket account email"
                        value={bankForm.email}
                        onChange={(e) => setBankForm({...bankForm, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Your UniMarket Account Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your UniMarket account password"
                        value={bankForm.password}
                        onChange={(e) => setBankForm({...bankForm, password: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="accountName">Account Name</Label>
                      <Input
                        id="accountName"
                        placeholder="Account Name"
                        value={bankForm.accountName}
                        onChange={(e) => setBankForm({...bankForm, accountName: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        placeholder="Account Number"
                        value={bankForm.accountNumber}
                        onChange={(e) => setBankForm({...bankForm, accountNumber: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        placeholder="Bank Name"
                        value={bankForm.bankName}
                        onChange={(e) => setBankForm({...bankForm, bankName: e.target.value})}
                      />
                    </div>
                    <Button 
                      onClick={updateBankDetails}
                      className="w-full"
                      disabled={!bankForm.email || !bankForm.password || !bankForm.accountName || !bankForm.accountNumber || !bankForm.bankName}
                    >
                      Update Bank Details
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {bankDetails?.bank_account_name ? (
                <div className="space-y-2">
                  <p><strong>Account Name:</strong> {bankDetails.bank_account_name}</p>
                  <p><strong>Account Number:</strong> {bankDetails.bank_account_number}</p>
                  <p><strong>Bank:</strong> {bankDetails.bank_name}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No bank details added yet</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No transactions yet
                </p>
              ) : (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {transaction.transaction_type === 'credit' ? (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={transaction.transaction_type === 'credit' ? 'default' : 'destructive'}
                        >
                          {transaction.transaction_type === 'credit' ? '+' : '-'}₦{transaction.amount.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Wallet;