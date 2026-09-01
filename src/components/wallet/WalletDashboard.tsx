import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet,
  TrendingUp,
  DollarSign,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
} from "lucide-react";
import { AnchorVirtualAccountCard } from "./AnchorVirtualAccountCard";

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

const STATUS_TONE: Record<string, string> = {
  pending: "bg-flora-chip text-flora-muted",
  processing: "bg-blue-50 text-blue-600",
  completed: "bg-flora-tagBg text-flora-tagText",
  failed: "bg-red-50 text-red-600",
  cancelled: "bg-flora-chip text-flora-muted",
};

const WalletDashboard = () => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [escrowData, setEscrowData] = useState<EscrowData>({ total_escrow_amount: 0, escrow_count: 0 });
  const [escrowTransactions, setEscrowTransactions] = useState<EscrowTransaction[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showEscrowModal, setShowEscrowModal] = useState(false);
  const [analyticsFilter, setAnalyticsFilter] = useState("best_selling");
  const [userId, setUserId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchWalletData();
    fetchEscrowData();
    fetchProductAnalytics();
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
      setUserId(user.id);

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
        return <ArrowUpRight className="h-4 w-4 text-flora-leaf" />;
      case "debit":
        return <ArrowDownLeft className="h-4 w-4 text-red-600" />;
      case "commission":
        return <DollarSign className="h-4 w-4 text-amber-600" />;
      case "payout":
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case "refund":
        return <ArrowUpRight className="h-4 w-4 text-flora-leaf" />;
      default:
        return <Clock className="h-4 w-4 text-flora-muted" />;
    }
  };

  const getStatusBadge = (status: string) => (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
        STATUS_TONE[status] || "bg-flora-chip text-flora-muted"
      }`}
    >
      {status}
    </span>
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/4 rounded-full bg-flora-chip"></div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-3xl bg-flora-chip/60"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl font-bold text-flora-ink sm:text-2xl">Earnings</h2>
      </div>

      {/* Anchor BaaS Virtual Account & Escrow - the one real withdrawal path.
          The legacy "Request Payout" / "Bank Details" flow that used to sit
          above this (its own bank_details table + email/password
          re-verification dialog) was retired: a real, admin-reviewed manual
          channel, but a dormant one - exactly one payout ever went through
          it (approved and processed back in January), nothing pending.
          AnchorVirtualAccountCard's own Withdraw button (opens
          AnchorWithdrawalModal) is now the sole seller-facing entry point. */}
      {userId && (
        <AnchorVirtualAccountCard
          userId={userId}
          onBalanceUpdated={fetchWalletData}
        />
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-3xl bg-flora-card p-3.5 shadow-card sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-flora-muted sm:text-sm">
              Available Balance
            </span>
            <Wallet className="h-4 w-4 text-flora-leaf" />
          </div>
          <div className="mt-1 text-lg font-bold text-flora-ink sm:mt-2 sm:text-2xl">
            ₦{wallet?.available_balance.toLocaleString() || 0}
          </div>
          <p className="text-xs text-flora-muted">
            Ready for withdrawal
          </p>
        </div>

        <div className="rounded-3xl bg-flora-card p-3.5 shadow-card sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-flora-muted sm:text-sm">
              Total Earnings
            </span>
            <TrendingUp className="h-4 w-4 text-flora-leaf" />
          </div>
          <div className="mt-1 text-lg font-bold text-flora-ink sm:mt-2 sm:text-2xl">
            ₦{wallet?.total_earnings.toLocaleString() || 0}
          </div>
          <p className="text-xs text-flora-muted">Lifetime earnings</p>
        </div>

        <button
          type="button"
          onClick={() => setShowEscrowModal(true)}
          className="rounded-3xl bg-flora-card p-3.5 text-left shadow-card transition hover:brightness-[0.98] sm:p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-flora-muted sm:text-sm">
              Pending Balance
            </span>
            <Clock className="h-4 w-4 text-flora-leaf" />
          </div>
          <div className="mt-1 text-lg font-bold text-flora-ink sm:mt-2 sm:text-2xl">
            ₦{escrowData.total_escrow_amount.toLocaleString()}
          </div>
          <p className="text-xs text-flora-muted">
            {escrowData.escrow_count} orders in escrow
          </p>
          <p className="text-xs text-flora-leaf mt-1">
            Tap to view details
          </p>
        </button>
      </div>

      {/* Tabs for Transactions and Payouts */}
      <Tabs defaultValue="transactions" className="space-y-3 sm:space-y-4">
        <TabsList className="grid h-fit w-full grid-cols-2 gap-1 rounded-2xl bg-flora-chip/70 p-1">
          <TabsTrigger value="transactions" className="rounded-xl text-xs sm:text-sm">
            Transactions
          </TabsTrigger>
          <TabsTrigger value="payouts" className="rounded-xl text-xs sm:text-sm">
            Payouts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <div className="rounded-3xl bg-flora-card p-3.5 shadow-card sm:p-6">
            <h3 className="text-base font-semibold text-flora-ink sm:text-lg">
              Transaction History
            </h3>
            <div className="mt-4">
              {transactions.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <Wallet className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-flora-muted" />
                  <p className="text-base sm:text-lg font-medium text-flora-ink">
                    No transactions yet
                  </p>
                  <p className="text-sm sm:text-base text-flora-muted">
                    Your transaction history will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-flora-ink/10 p-3 sm:p-4"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        {getTransactionIcon(transaction.type)}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate text-flora-ink">
                            {transaction.description}
                          </p>
                          <p className="text-xs sm:text-sm text-flora-muted">
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
                              ? "text-flora-leaf"
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
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payouts">
          <div className="rounded-3xl bg-flora-card p-3.5 shadow-card sm:p-6">
            <h3 className="text-base font-semibold text-flora-ink sm:text-lg">
              Payout Requests
            </h3>
            <div className="mt-4">
              {payoutRequests.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <CreditCard className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-flora-muted" />
                  <p className="text-base sm:text-lg font-medium text-flora-ink">
                    No payout requests
                  </p>
                  <p className="text-sm sm:text-base text-flora-muted">
                    Your payout requests will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {payoutRequests.map((payout) => (
                    <div
                      key={payout.id}
                      className="rounded-2xl border border-flora-ink/10 p-3 sm:p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base sm:text-lg text-flora-ink">
                            ₦{payout.amount.toLocaleString()}
                          </p>
                          <p className="text-xs sm:text-sm text-flora-muted truncate">
                            {payout.bank_account_name} • {payout.bank_name}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(payout.status)}
                        </div>
                      </div>
                      <p className="text-xs text-flora-muted">
                        Requested on{" "}
                        {new Date(payout.created_at).toLocaleDateString()}
                      </p>
                      {payout.admin_notes && (
                        <p className="text-xs sm:text-sm mt-2 p-2 bg-flora-chip rounded-xl text-flora-ink">
                          <strong>Admin Notes:</strong> {payout.admin_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Escrow Details Modal */}
      <Dialog open={showEscrowModal} onOpenChange={setShowEscrowModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escrow Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl bg-flora-chip p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-flora-ink">Total Amount in Escrow:</span>
                <span className="text-lg font-bold text-flora-ink">
                  ₦{escrowData.total_escrow_amount.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-flora-muted mt-1">
                {escrowData.escrow_count} orders pending buyer confirmation
              </p>
            </div>

            {escrowTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 text-flora-muted" />
                <p className="text-lg font-medium text-flora-ink">No funds in escrow</p>
                <p className="text-flora-muted">All your orders have been confirmed</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-medium text-flora-ink">Orders in Escrow:</h3>
                {escrowTransactions.map((transaction) => (
                  <div key={transaction.id} className="rounded-2xl border border-flora-ink/10 p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-flora-ink">
                          {transaction.orders?.products?.title || "Unknown Product"}
                        </p>
                        <p className="text-sm text-flora-muted">
                          Buyer: {transaction.orders?.buyer_profile?.full_name || "Unknown"}
                        </p>
                        <p className="text-xs text-flora-muted">
                          Order #{transaction.order_id.slice(-8)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-flora-leaf">
                          ₦{transaction.seller_amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-flora-muted">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl bg-flora-chip p-3.5">
              <p className="text-sm text-flora-ink">
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
