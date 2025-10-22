import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput, validateAmount, validateName } from "@/lib/security";
import {
  Wallet,
  TrendingUp,
  DollarSign,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Eye,
  Heart,
  ShoppingCart,
  Package,
} from "lucide-react";

interface WalletData {
  id: string;
  available_balance: number;
  pending_balance: number;
  total_earnings: number;
  total_commission_paid: number;
}

interface EscrowData {
  total_escrow_amount: number;
  escrow_count: number;
}

interface EscrowTransaction {
  id: string;
  order_id: string;
  seller_amount: number;
  created_at: string;
  orders: {
    id: string;
    buyer_profile: {
      full_name: string;
    };
    products: {
      title: string;
    };
  };
}

interface ProductAnalytics {
  product_id: string;
  product_title: string;
  views: number;
  favorites_count: number;
  cart_additions: number;
  orders_count: number;
  revenue: number;
}

interface UserProfile {
  email: string;
}

interface BankDetails {
  id: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_name: string;
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
  const [escrowData, setEscrowData] = useState<EscrowData>({ total_escrow_amount: 0, escrow_count: 0 });
  const [escrowTransactions, setEscrowTransactions] = useState<EscrowTransaction[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics[]>(
    []
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [showBankDetailsDialog, setShowBankDetailsDialog] = useState(false);
  const [showEscrowModal, setShowEscrowModal] = useState(false);
  const [analyticsFilter, setAnalyticsFilter] = useState("best_selling");
  const [emailVerification, setEmailVerification] = useState("");
  const [passwordVerification, setPasswordVerification] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const { toast } = useToast();

  const [payoutForm, setPayoutForm] = useState({
    amount: "",
  });

  const [bankDetailsForm, setBankDetailsForm] = useState({
    bank_account_name: "",
    bank_account_number: "",
    bank_name: "",
  });

  useEffect(() => {
    fetchWalletData();
    fetchEscrowData();
    fetchProductAnalytics();
    fetchUserProfile();
    fetchBankDetails();
  }, []);

  // Real-time updates for wallet, orders, and transactions
  useEffect(() => {
    const setupRealTime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`wallet-realtime-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wallets',
          },
          (payload) => {
            const walletData = payload.new as any;
            if (walletData?.user_id === user.id) {
              fetchWalletData();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wallet_transactions',
          },
          (payload) => {
            const transactionData = payload.new as any;
            if (transactionData?.user_id === user.id) {
              fetchWalletData();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'escrow_transactions',
          },
          (payload) => {
            const escrowData = payload.new as any;
            if (escrowData?.seller_id === user.id) {
              fetchEscrowData();
              fetchWalletData(); // Refresh wallet when escrow changes
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
          },
          (payload) => {
            const orderData = payload.new as any;
            if (orderData?.seller_id === user.id) {
              fetchEscrowData(); // New orders affect escrow
              fetchProductAnalytics(); // Orders affect analytics
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payout_requests',
          },
          (payload) => {
            const payoutData = payload.new as any;
            if (payoutData?.user_id === user.id) {
              fetchWalletData(); // Refresh to show updated payout requests
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealTime();

    return () => {
      if (cleanup) {
        cleanup.then((fn) => fn && fn());
      }
    };
  }, []);

  const fetchWalletData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch wallet
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (walletError && walletError.code !== "PGRST116") throw walletError;

      if (walletData) {
        setWallet(walletData);
      }

      // Fetch transactions
      const { data: transactionsData, error: transactionsError } =
        await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);

      // Fetch payout requests
      const { data: payoutsData, error: payoutsError } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (payoutsError) throw payoutsError;
      setPayoutRequests(payoutsData || []);
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      toast({
        title: "Error",
        description: "Failed to load wallet data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEscrowData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch detailed escrow transactions for this seller
      const { data: escrowTransactionsData, error } = await supabase
        .from("escrow_transactions")
        .select(`
          id,
          order_id,
          seller_amount,
          created_at,
          orders(
            id,
            buyer_profile:profiles!orders_buyer_id_fkey(full_name),
            products(title)
          )
        `)
        .eq("seller_id", user.id)
        .eq("status", "held")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const totalEscrowAmount = (escrowTransactionsData || []).reduce(
        (sum, transaction) => sum + (transaction.seller_amount || 0),
        0
      );

      setEscrowTransactions(escrowTransactionsData || []);
      setEscrowData({
        total_escrow_amount: totalEscrowAmount,
        escrow_count: escrowTransactionsData?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching escrow data:", error);
    }
  };

  const fetchProductAnalytics = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("product_analytics")
        .select(
          `
          *,
          products!inner(title, seller_id)
        `
        )
        .eq("products.seller_id", user.id);

      if (error) throw error;

      const analyticsWithTitle = (data || []).map((item) => ({
        ...item,
        product_title: item.products.title,
      }));

      setProductAnalytics(analyticsWithTitle);
    } catch (error) {
      console.error("Error fetching product analytics:", error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchBankDetails = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("bank_details")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setBankDetails(data);
        setBankDetailsForm({
          bank_account_name: data.bank_account_name,
          bank_account_number: data.bank_account_number,
          bank_name: data.bank_name,
        });
      }
    } catch (error) {
      console.error("Error fetching bank details:", error);
    }
  };

  const handlePayoutRequest = async () => {
    if (payoutLoading) return;
    
    try {
      setPayoutLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !wallet) return;

      const amount = parseFloat(payoutForm.amount);
      if (!validateAmount(amount, wallet.available_balance)) {
        toast({
          title: "Invalid Amount",
          description:
            "Please enter a valid amount within your available balance",
          variant: "destructive",
        });
        return;
      }

      // Minimum payout amount check
      if (amount < 100) {
        toast({
          title: "Minimum Payout Amount",
          description: "Minimum payout amount is ₦100",
          variant: "destructive",
        });
        return;
      }

      // Require saved bank details
      if (!bankDetails) {
        toast({
          title: "Missing Bank Details",
          description: "Please add your bank details first using the Bank Details button",
          variant: "destructive",
        });
        return;
      }

      const bankDetailsToUse = {
        bank_account_name: bankDetails.bank_account_name,
        bank_account_number: bankDetails.bank_account_number,
        bank_name: bankDetails.bank_name,
      };

      // Create payout request
      const { data: payoutData, error: insertError } = await supabase.from("payout_requests").insert({
        user_id: user.id,
        wallet_id: wallet.id,
        amount,
        ...bankDetailsToUse,
      }).select().single();

      if (insertError) throw insertError;

      toast({
        title: "Payout Requested",
        description: "Your payout request has been submitted and will be processed within 24 hours",
      });

      setShowPayoutDialog(false);
      setPayoutForm({
        amount: "",
      });
      fetchWalletData();
      fetchEscrowData();
    } catch (error) {
      console.error("Error requesting payout:", error);
      toast({
        title: "Error",
        description: "Failed to submit payout request",
        variant: "destructive",
      });
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleUpdateBankDetails = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !userProfile) return;

      // Input validation and sanitization
      const sanitizedAccountName = sanitizeInput(
        bankDetailsForm.bank_account_name
      );
      const sanitizedAccountNumber = sanitizeInput(
        bankDetailsForm.bank_account_number
      );
      const sanitizedBankName = sanitizeInput(bankDetailsForm.bank_name);

      if (
        !sanitizedAccountName ||
        !sanitizedAccountNumber ||
        !sanitizedBankName
      ) {
        toast({
          title: "Validation Error",
          description: "All bank details fields are required",
          variant: "destructive",
        });
        return;
      }

      if (!validateName(sanitizedAccountName)) {
        toast({
          title: "Invalid Account Name",
          description:
            "Account name must be 2-50 characters and contain only letters",
          variant: "destructive",
        });
        return;
      }

      if (
        sanitizedAccountNumber.length < 10 ||
        sanitizedAccountNumber.length > 20
      ) {
        toast({
          title: "Invalid Account Number",
          description: "Account number must be 10-20 characters",
          variant: "destructive",
        });
        return;
      }

      if (sanitizedBankName.length < 2 || sanitizedBankName.length > 50) {
        toast({
          title: "Invalid Bank Name",
          description: "Bank name must be 2-50 characters",
          variant: "destructive",
        });
        return;
      }

      // Verify email and password
      if (emailVerification !== userProfile.email) {
        toast({
          title: "Email Verification Failed",
          description: "Please enter your correct email address",
          variant: "destructive",
        });
        return;
      }

      if (!passwordVerification.trim()) {
        toast({
          title: "Password Required",
          description: "Please enter your password to verify your identity",
          variant: "destructive",
        });
        return;
      }

      // Verify password by attempting to sign in
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: passwordVerification,
      });

      if (authError) {
        toast({
          title: "Password Verification Failed",
          description: "Please enter your correct password",
          variant: "destructive",
        });
        return;
      }

      // Upsert bank details with sanitized input
      const { error } = await supabase.from("bank_details").upsert(
        {
          user_id: user.id,
          bank_account_name: sanitizedAccountName,
          bank_account_number: sanitizedAccountNumber,
          bank_name: sanitizedBankName,
        },
        {
          onConflict: "user_id",
        }
      );

      if (error) throw error;

      toast({
        title: "Bank Details Updated",
        description: "Your bank details have been saved securely",
      });

      setShowBankDetailsDialog(false);
      setEmailVerification("");
      setPasswordVerification("");
      fetchBankDetails(); // Refresh bank details
    } catch (error) {
      console.error("Error updating bank details:", error);
      toast({
        title: "Error",
        description: "Failed to update bank details",
        variant: "destructive",
      });
    }
  };

  const getFilteredAnalytics = () => {
    const sorted = [...productAnalytics];
    switch (analyticsFilter) {
      case "view_all":
        return sorted;
      case "best_selling":
        return sorted.sort((a, b) => b.orders_count - a.orders_count);
      case "most_views":
        return sorted.sort((a, b) => b.views - a.views);
      case "most_cart_adds":
        return sorted.sort((a, b) => b.cart_additions - a.cart_additions);
      case "most_favorited":
        return sorted.sort((a, b) => b.favorites_count - a.favorites_count);
      case "highest_revenue":
        return sorted.sort((a, b) => b.revenue - a.revenue);
      default:
        return sorted;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "credit":
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case "debit":
        return <ArrowDownLeft className="h-4 w-4 text-red-600" />;
      case "commission":
        return <DollarSign className="h-4 w-4 text-orange-600" />;
      case "payout":
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case "refund":
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      processing: "outline",
      completed: "default",
      failed: "destructive",
      cancelled: "secondary",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status}
      </Badge>
    );
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">Wallet Dashboard</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog
            open={showBankDetailsDialog}
            onOpenChange={setShowBankDetailsDialog}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Wallet className="h-4 w-4 mr-2" />
                Bank Details
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Bank Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-yellow-800 mb-2">
                    Security Verification Required
                  </p>
                  <p className="text-xs text-yellow-700">
                    Please enter your UniMarket account email and password to
                    verify your identity before updating bank details.
                  </p>
                </div>
                <div>
                  <Label htmlFor="verify_email">
                    Your UniMarket Account Email
                  </Label>
                  <Input
                    id="verify_email"
                    type="email"
                    placeholder="Enter your UniMarket account email"
                    value={emailVerification}
                    onChange={(e) => setEmailVerification(e.target.value)}
                    autoComplete="off"
                    data-form-type="other"
                  />
                </div>
                <div>
                  <Label htmlFor="verify_password">
                    Your UniMarket Account Password
                  </Label>
                  <Input
                    id="verify_password"
                    type="password"
                    placeholder="Enter your UniMarket account password"
                    value={passwordVerification}
                    onChange={(e) => setPasswordVerification(e.target.value)}
                    autoComplete="off"
                    data-form-type="other"
                  />
                </div>
                <div>
                  <Label htmlFor="bank_account_name">Account Name</Label>
                  <Input
                    id="bank_account_name"
                    placeholder="Full name on account"
                    value={bankDetailsForm.bank_account_name}
                    onChange={(e) =>
                      setBankDetailsForm({
                        ...bankDetailsForm,
                        bank_account_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="bank_account_number">Account Number</Label>
                  <Input
                    id="bank_account_number"
                    placeholder="Bank account number"
                    value={bankDetailsForm.bank_account_number}
                    onChange={(e) =>
                      setBankDetailsForm({
                        ...bankDetailsForm,
                        bank_account_number: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Select
                    value={bankDetailsForm.bank_name}
                    onValueChange={(value) =>
                      setBankDetailsForm({
                        ...bankDetailsForm,
                        bank_name: value,
                      })
                    }
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
                      <SelectItem value="Kuda Bank">Kuda Bank</SelectItem>
                      <SelectItem value="Opay">Opay</SelectItem>
                      <SelectItem value="PalmPay">PalmPay</SelectItem>
                      <SelectItem value="Moniepoint">Moniepoint</SelectItem>
                      <SelectItem value="Carbon">Carbon</SelectItem>
                      <SelectItem value="Rubies Bank">Rubies Bank</SelectItem>
                      <SelectItem value="VFD Microfinance Bank">VFD Microfinance Bank</SelectItem>
                      <SelectItem value="Jaiz Bank">Jaiz Bank</SelectItem>
                      <SelectItem value="TAJ Bank">TAJ Bank</SelectItem>
                      <SelectItem value="Lotus Bank">Lotus Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleUpdateBankDetails} className="w-full">
                  Update Bank Details
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {(!wallet || wallet.available_balance < 100 || !bankDetails) ? (
            <Button
              disabled
              className="w-full sm:w-auto"
              onClick={() => {
                if (!bankDetails) {
                  toast({
                    title: "Bank Details Required",
                    description: "Please add your bank details first using the 'Bank Details' button above.",
                    variant: "destructive",
                  });
                } else if (!wallet || wallet.available_balance < 100) {
                  toast({
                    title: "Insufficient Balance",
                    description: "Minimum payout amount is ₦100",
                    variant: "destructive",
                  });
                }
              }}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Request Payout
            </Button>
          ) : (
            <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Request Payout
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Payout</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💰 <strong>Processing Time:</strong> Your payout will be processed and transferred to your bank account within 48 hours of approval.
                  </p>
                </div>
                <div>
                  <Label>
                    Available Balance: ₦
                    {wallet?.available_balance.toLocaleString() || 0}
                  </Label>
                </div>
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={payoutForm.amount}
                    onChange={(e) =>
                      setPayoutForm({ ...payoutForm, amount: e.target.value })
                    }
                    max={wallet?.available_balance || 0}
                  />
                </div>
                {bankDetails ? (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">
                      Using Saved Bank Details:
                    </p>
                    <p className="text-sm">{bankDetails.bank_account_name}</p>
                    <p className="text-sm">{bankDetails.bank_name}</p>
                    <p className="text-sm">
                      ****{bankDetails.bank_account_number.slice(-4)}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Please add your bank details first using the "Bank Details" button above.
                    </p>
                  </div>
                )}
                <Button 
                  onClick={handlePayoutRequest} 
                  className="w-full"
                  disabled={!bankDetails || payoutLoading}
                  loading={payoutLoading}
                >
                  {payoutLoading ? 'Processing...' : bankDetails ? 'Request Payout' : 'Add Bank Details First'}
                </Button>
              </div>
            </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Available Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">
              ₦{wallet?.available_balance.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for withdrawal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Total Earnings
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">
              ₦{wallet?.total_earnings.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setShowEscrowModal(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Pending Balance
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">
              ₦{escrowData.total_escrow_amount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {escrowData.escrow_count} orders in escrow
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Click to view details
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Transactions and Payouts */}
      <Tabs defaultValue="transactions" className="space-y-3 sm:space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-fit">
          <TabsTrigger value="transactions" className="text-xs sm:text-sm">
            Transactions
          </TabsTrigger>
          <TabsTrigger value="payouts" className="text-xs sm:text-sm">
            Payouts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {transactions.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <Wallet className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                  <p className="text-base sm:text-lg font-medium">
                    No transactions yet
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Your transaction history will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 sm:p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        {getTransactionIcon(transaction.type)}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">
                            {transaction.description}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {new Date(
                              transaction.created_at
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`font-bold text-sm sm:text-base ${
                            transaction.type === "credit" ||
                            transaction.type === "refund"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.type === "credit" ||
                          transaction.type === "refund"
                            ? "+"
                            : "-"}
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
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">
                Payout Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {payoutRequests.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <CreditCard className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                  <p className="text-base sm:text-lg font-medium">
                    No payout requests
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Your payout requests will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {payoutRequests.map((payout) => (
                    <div
                      key={payout.id}
                      className="p-3 sm:p-4 border rounded-lg"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base sm:text-lg">
                            ₦{payout.amount.toLocaleString()}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {payout.bank_account_name} • {payout.bank_name}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(payout.status)}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Requested on{" "}
                        {new Date(payout.created_at).toLocaleDateString()}
                      </p>
                      {payout.admin_notes && (
                        <p className="text-xs sm:text-sm mt-2 p-2 bg-muted rounded">
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

      {/* Escrow Details Modal */}
      <Dialog open={showEscrowModal} onOpenChange={setShowEscrowModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escrow Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Amount in Escrow:</span>
                <span className="text-lg font-bold">
                  ₦{escrowData.total_escrow_amount.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {escrowData.escrow_count} orders pending buyer confirmation
              </p>
            </div>
            
            {escrowTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">No funds in escrow</p>
                <p className="text-muted-foreground">All your orders have been confirmed</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-medium">Orders in Escrow:</h3>
                {escrowTransactions.map((transaction) => (
                  <div key={transaction.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium">
                          {transaction.orders?.products?.title || "Unknown Product"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Buyer: {transaction.orders?.buyer_profile?.full_name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Order #{transaction.order_id.slice(-8)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          ₦{transaction.seller_amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Note:</strong> Funds are automatically released when buyers confirm receipt, 
                or after 2 days if no action is taken.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletDashboard;
