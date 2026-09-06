import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Package, TrendingUp, RefreshCw, ShoppingCart, CheckCircle, Eye, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { approveSellerEscrow } from '@/services/anchorBaasService';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cartItems: number;
  totalRevenue: number;
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  quantity: number;
  payment_method: string | null;
  payment_reference: string | null;
  shipping_address: string | null;
  created_at: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  buyer_profile: { full_name: string; email: string };
  seller_profile: { full_name: string; email: string };
  products: { title: string; price: number };
  escrow_transactions: { id: string; status: string; seller_amount: number }[];
}

interface TopSeller {
  seller_id: string;
  full_name: string;
  email: string;
  total_sales: number;
  total_orders: number;
  rating: number;
}

interface CartItem {
  id: string;
  quantity: number;
  created_at: string;
  user_profile: { full_name: string; email: string };
  products: { title: string; price: number; seller_id: string };
}

const statusPillClasses = (status: string) => {
  if (status === 'confirmed' || status === 'completed') return 'bg-flora-leaf/15 text-flora-leaf';
  if (status === 'pending') return 'bg-amber-100 text-amber-700';
  if (status === 'cancelled' || status === 'refunded') return 'bg-red-100 text-red-600';
  return 'bg-flora-chip text-flora-ink';
};

interface OrdersTabProps {
  // Lets the nav sidebar show a real pending-orders badge without this
  // component's own fetch being duplicated at the Admin.tsx level.
  onCountsChange?: (pendingOrders: number) => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({ onCountsChange }) => {
  const [orderStats, setOrderStats] = useState<OrderStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cartItems: 0,
    totalRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrdersData();
  }, []);

  useEffect(() => {
    onCountsChange?.(orderStats.pendingOrders);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderStats.pendingOrders]);

  const fetchOrdersData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOrderStats(),
        fetchRecentOrders(),
        fetchTopSellers(),
        fetchCartItems(),
      ]);
    } catch (error) {
      toast.error('Failed to fetch orders data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderStats = async () => {
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('status, total_amount');

      if (ordersError) throw ordersError;

      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
      const completedOrders = orders?.filter(o => o.status === 'confirmed').length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      const { data: cart, error: cartError } = await supabase
        .from('cart')
        .select('id');

      if (cartError) throw cartError;

      setOrderStats({
        totalOrders,
        pendingOrders,
        completedOrders,
        cartItems: cart?.length || 0,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error fetching order stats:', error);
    }
  };

  const statusFilteredOrders = useMemo(() =>
    statusFilter === 'all' ? recentOrders : recentOrders.filter(o => o.status === statusFilter)
  , [recentOrders, statusFilter]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return statusFilteredOrders;
    return statusFilteredOrders.filter(order =>
      order.id.toLowerCase().includes(q) ||
      order.products?.title?.toLowerCase().includes(q) ||
      order.buyer_profile?.full_name?.toLowerCase().includes(q) ||
      order.seller_profile?.full_name?.toLowerCase().includes(q)
    );
  }, [statusFilteredOrders, orderSearch]);

  const fetchRecentOrders = async () => {
    try {
      // Step 1: fetch orders flat
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, total_amount, quantity, payment_method, payment_reference, shipping_address, created_at, buyer_id, seller_id, product_id')
        .order('created_at', { ascending: false })
        .limit(200);

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) { setRecentOrders([]); return; }

      // Step 2: collect unique IDs
      const profileIds = [...new Set([...orders.map(o => o.buyer_id), ...orders.map(o => o.seller_id)])];
      const productIds = [...new Set(orders.map(o => o.product_id))];
      const orderIds = orders.map(o => o.id);

      // Step 3: parallel fetch related data
      const [{ data: profiles }, { data: products }, { data: escrows }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email').in('user_id', profileIds),
        supabase.from('products').select('id, title, price').in('id', productIds),
        supabase.from('escrow_transactions').select('id, order_id, status, seller_amount').in('order_id', orderIds),
      ]);

      // Step 4: merge
      const merged: Order[] = orders.map(order => ({
        ...order,
        buyer_profile: profiles?.find(p => p.user_id === order.buyer_id) || { full_name: 'Unknown', email: '' },
        seller_profile: profiles?.find(p => p.user_id === order.seller_id) || { full_name: 'Unknown', email: '' },
        products: products?.find(p => p.id === order.product_id) || { title: 'Unknown Product', price: 0 },
        escrow_transactions: escrows?.filter(e => e.order_id === order.id) || [],
      }));

      setRecentOrders(merged);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      setRecentOrders([]);
    }
  };

  const releaseFunds = async (orderId: string) => {
    try {
      // Get the order with escrow transaction
      const order = recentOrders.find(o => o.id === orderId);
      if (!order || !order.escrow_transactions || order.escrow_transactions.length === 0) {
        toast.error('No escrow transaction found for this order');
        return;
      }

      const escrowTransaction = order.escrow_transactions[0];
      if (escrowTransaction.status !== 'held') {
        toast.error('Funds have already been released or are not available for release');
        return;
      }

      // Release escrow funds - the edge function does the real authorization
      // check and the actual Anchor bank transfer, and is the only thing
      // that can call release_escrow_funds now that it's service_role-only.
      // It also updates orders.status itself, so there's no separate update
      // to do here.
      const result = await approveSellerEscrow(orderId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);

      // Refresh the orders data
      fetchRecentOrders();
      fetchOrderStats();
    } catch (error) {
      console.error('Error releasing funds:', error);
      toast.error('Failed to release funds');
    }
  };

  const fetchTopSellers = async () => {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('seller_id, total_amount')
        .eq('status', 'confirmed');

      if (error) throw error;
      if (!orders || orders.length === 0) { setTopSellers([]); return; }

      const sellerIds = [...new Set(orders.map(o => o.seller_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, rating')
        .in('user_id', sellerIds);

      const sellerMap = new Map();
      orders.forEach(order => {
        const profile = profiles?.find(p => p.user_id === order.seller_id);
        if (!sellerMap.has(order.seller_id)) {
          sellerMap.set(order.seller_id, {
            seller_id: order.seller_id,
            full_name: profile?.full_name || 'Unknown',
            email: profile?.email || 'Unknown',
            rating: profile?.rating || 0,
            total_sales: 0,
            total_orders: 0,
          });
        }
        const seller = sellerMap.get(order.seller_id);
        seller.total_sales += Number(order.total_amount);
        seller.total_orders += 1;
      });

      setTopSellers(
        Array.from(sellerMap.values())
          .sort((a, b) => b.total_sales - a.total_sales)
          .slice(0, 5)
      );
    } catch (error) {
      console.error('Error fetching top sellers:', error);
      setTopSellers([]);
    }
  };

  const fetchCartItems = async () => {
    try {
      const { data: cartData, error: cartError } = await supabase
        .from('cart')
        .select(`
          id,
          quantity,
          created_at,
          user_id,
          product_id,
          products(title, price, seller_id)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (cartError) throw cartError;

      if (!cartData || cartData.length === 0) {
        setCartItems([]);
        return;
      }

      // Fetch user profiles separately since cart has no FK to profiles
      const userIds = [...new Set(cartData.map(item => item.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const enriched = cartData.map(item => ({
        ...item,
        user_profile: profiles?.find(p => p.user_id === item.user_id) || null,
      }));

      setCartItems(enriched);
    } catch (error) {
      console.error('Error fetching cart items:', error);
      setCartItems([]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-3xl bg-flora-card p-5 shadow-card">
              <div className="animate-pulse">
                <div className="mb-2 h-4 rounded-full bg-flora-chip"></div>
                <div className="h-8 rounded-full bg-flora-chip"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Order Statistics — clickable to filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Orders', value: orderStats.totalOrders, filter: 'all', sub: 'All time orders', icon: <Package className="h-4 w-4 text-flora-ink" /> },
          { label: 'Pending Orders', value: orderStats.pendingOrders, filter: 'pending', sub: 'Awaiting processing', icon: <Package className="h-4 w-4 text-amber-500" /> },
          { label: 'Completed Orders', value: orderStats.completedOrders, filter: 'completed', sub: 'Successfully delivered', icon: <Package className="h-4 w-4 text-flora-leaf" /> },
          { label: 'Cart Items', value: orderStats.cartItems, filter: null, sub: 'Items in carts', icon: <ShoppingCart className="h-4 w-4 text-flora-ink" /> },
        ].map(({ label, value, filter, sub, icon }) => (
          <button
            type="button"
            key={label}
            onClick={() => filter && setStatusFilter(filter)}
            disabled={!filter}
            className={`rounded-3xl bg-flora-card p-5 text-left shadow-card transition ${
              filter ? 'cursor-pointer hover:shadow-floating' : 'cursor-default'
            } ${statusFilter === filter ? 'ring-2 ring-flora-ink' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flora-chip">
                {icon}
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold text-flora-ink">{value}</div>
            <p className="text-sm font-medium text-flora-muted">{label}</p>
            <p className="text-xs text-flora-muted">{sub}</p>
          </button>
        ))}
      </div>

      {/* Top Performing Sellers */}
      <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-flora-ink">Top Performing Sellers</h2>
          <button
            type="button"
            onClick={fetchOrdersData}
            className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-4 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
        <p className="mt-1 text-sm text-flora-muted">Sellers with highest sales and ratings</p>
        {topSellers.length === 0 ? (
          <div className="py-8 text-center">
            <TrendingUp className="mx-auto mb-4 h-12 w-12 text-flora-muted" />
            <h3 className="mb-2 text-lg font-semibold text-flora-ink">No sales data available</h3>
            <p className="text-flora-muted">Sales analytics will appear here once orders are placed</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-flora-ink/10">
            <Table>
              <TableHeader>
                <TableRow className="bg-flora-chip/40 hover:bg-flora-chip/40">
                  <TableHead className="text-flora-ink">Seller</TableHead>
                  <TableHead className="text-flora-ink">Email</TableHead>
                  <TableHead className="text-flora-ink">Total Sales</TableHead>
                  <TableHead className="text-flora-ink">Orders</TableHead>
                  <TableHead className="text-flora-ink">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSellers.map((seller, index) => (
                  <TableRow key={seller.seller_id} className="hover:bg-flora-chip/20">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            index === 0 ? 'bg-flora-ink text-white' : 'bg-flora-chip text-flora-ink'
                          }`}
                        >
                          #{index + 1}
                        </span>
                        <span className="font-medium text-flora-ink">{seller.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-flora-muted">{seller.email}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-flora-leaf">
                        ₦{seller.total_sales.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-flora-muted">{seller.total_orders}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-flora-ink">
                        <span>{seller.rating.toFixed(1)}</span>
                        <span className="text-amber-500">★</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-flora-ink">
              {statusFilter === 'all' ? 'All Orders' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Orders`}
              <span className="ml-2 text-sm font-normal text-flora-muted">({filteredOrders.length})</span>
            </h2>
            <p className="mt-1 text-sm text-flora-muted">Click a stat card above to filter, or choose a status below</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 rounded-full border border-flora-ink/15 bg-white px-3 text-sm text-flora-ink"
            >
              {['all','pending','paid','shipped','delivered','confirmed','disputed','cancelled','refunded'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={fetchOrdersData}
              className="inline-flex items-center justify-center rounded-full border border-flora-ink/15 bg-white p-2 text-flora-ink transition hover:bg-flora-chip"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-flora-muted" />
          <Input
            placeholder="Search by order ID, product, buyer, or seller..."
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            className="rounded-full border-flora-ink/15 bg-white pl-10 text-sm focus-visible:ring-flora-ink"
          />
        </div>
        {statusFilteredOrders.length === 0 ? (
          <div className="py-8 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-flora-muted" />
            <h3 className="mb-2 text-lg font-semibold text-flora-ink">No {statusFilter === 'all' ? '' : statusFilter} orders</h3>
            <p className="text-flora-muted">No orders match this filter</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-8 text-center">
            <Search className="mx-auto mb-4 h-10 w-10 text-flora-muted" />
            <p className="text-flora-muted">No orders match "{orderSearch}"</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-flora-ink/10">
            <Table>
              <TableHeader>
                <TableRow className="bg-flora-chip/40 hover:bg-flora-chip/40">
                  <TableHead className="text-flora-ink">Order ID</TableHead>
                  <TableHead className="text-flora-ink">Product</TableHead>
                  <TableHead className="text-flora-ink">Buyer</TableHead>
                  <TableHead className="text-flora-ink">Seller</TableHead>
                  <TableHead className="text-flora-ink">Qty</TableHead>
                  <TableHead className="text-flora-ink">Amount</TableHead>
                  <TableHead className="text-flora-ink">Status</TableHead>
                  <TableHead className="text-flora-ink">Date</TableHead>
                  <TableHead className="text-flora-ink">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-flora-chip/20">
                    <TableCell className="font-mono text-xs text-flora-muted">#{order.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <p className="font-medium text-flora-ink">{order.products?.title || 'Unknown'}</p>
                      <p className="text-xs text-flora-muted">₦{Number(order.products?.price || 0).toLocaleString()}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-flora-ink">{order.buyer_profile?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-flora-muted">{order.buyer_profile?.email}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-flora-ink">{order.seller_profile?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-flora-muted">{order.seller_profile?.email}</p>
                    </TableCell>
                    <TableCell className="text-flora-muted">{order.quantity}</TableCell>
                    <TableCell className="font-semibold text-flora-ink">₦{Number(order.total_amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusPillClasses(order.status)}`}>
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-flora-muted">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center justify-center rounded-full border border-flora-ink/15 bg-white p-1.5 text-flora-ink transition hover:bg-flora-chip"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {order.status === 'paid' && order.escrow_transactions.length > 0 && order.escrow_transactions[0].status === 'held' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-full bg-flora-leaf px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Release
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-flora-ink">Release Escrow Funds</AlertDialogTitle>
                                <AlertDialogDescription className="text-flora-muted">
                                  Release ₦{order.escrow_transactions[0].seller_amount.toLocaleString()} to {order.seller_profile?.full_name}? Order status will change to confirmed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => releaseFunds(order.id)} className="bg-flora-leaf text-white hover:brightness-110">
                                  Release Funds
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {order.status === 'confirmed' && (
                          <span className="rounded-full bg-flora-leaf/15 px-2 py-0.5 text-xs font-medium text-flora-leaf">Released</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-flora-ink">Order Details — #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-flora-muted">Status</p>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusPillClasses(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-flora-muted">Date</p>
                  <p className="text-flora-ink">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-1 rounded-2xl border border-flora-ink/10 p-3">
                <p className="font-semibold text-flora-ink">Product</p>
                <p className="text-flora-ink">{selectedOrder.products?.title || 'Unknown'}</p>
                <p className="text-flora-muted">Unit price: ₦{Number(selectedOrder.products?.price || 0).toLocaleString()}</p>
                <p className="text-flora-muted">Qty: {selectedOrder.quantity}</p>
                <p className="font-medium text-flora-ink">Total: ₦{Number(selectedOrder.total_amount).toLocaleString()}</p>
              </div>

              <div className="space-y-1 rounded-2xl border border-flora-ink/10 p-3">
                <p className="font-semibold text-flora-ink">Buyer</p>
                <p className="text-flora-ink">{selectedOrder.buyer_profile?.full_name || 'Unknown'}</p>
                <p className="text-flora-muted">{selectedOrder.buyer_profile?.email}</p>
              </div>

              <div className="space-y-1 rounded-2xl border border-flora-ink/10 p-3">
                <p className="font-semibold text-flora-ink">Seller</p>
                <p className="text-flora-ink">{selectedOrder.seller_profile?.full_name || 'Unknown'}</p>
                <p className="text-flora-muted">{selectedOrder.seller_profile?.email}</p>
              </div>

              {selectedOrder.shipping_address && (
                <div className="space-y-1 rounded-2xl border border-flora-ink/10 p-3">
                  <p className="font-semibold text-flora-ink">Shipping Address</p>
                  <p className="text-flora-muted">{selectedOrder.shipping_address}</p>
                </div>
              )}

              {selectedOrder.payment_method && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-flora-muted">Payment Method</p>
                    <p className="text-flora-ink">{selectedOrder.payment_method}</p>
                  </div>
                  {selectedOrder.payment_reference && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-flora-muted">Reference</p>
                      <p className="font-mono text-xs text-flora-ink">{selectedOrder.payment_reference}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedOrder.escrow_transactions.length > 0 && (
                <div className="space-y-1 rounded-2xl border border-flora-ink/10 p-3">
                  <p className="font-semibold text-flora-ink">Escrow</p>
                  <p className="text-flora-ink">
                    Status:{' '}
                    <span className="rounded-full bg-flora-chip px-2 py-0.5 text-xs font-medium text-flora-ink">
                      {selectedOrder.escrow_transactions[0].status}
                    </span>
                  </p>
                  <p className="text-flora-muted">Seller amount: ₦{Number(selectedOrder.escrow_transactions[0].seller_amount).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Shopping Cart Analysis */}
      <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
        <h2 className="text-lg font-bold text-flora-ink">Shopping Cart Analysis</h2>
        <p className="mt-1 text-sm text-flora-muted">Products currently in user carts</p>
        {cartItems.length === 0 ? (
          <div className="py-8 text-center">
            <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-flora-muted" />
            <h3 className="mb-2 text-lg font-semibold text-flora-ink">No cart data available</h3>
            <p className="text-flora-muted">Cart analytics will show products users are interested in</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-flora-ink/10">
            <Table>
              <TableHeader>
                <TableRow className="bg-flora-chip/40 hover:bg-flora-chip/40">
                  <TableHead className="text-flora-ink">Product</TableHead>
                  <TableHead className="text-flora-ink">User</TableHead>
                  <TableHead className="text-flora-ink">Quantity</TableHead>
                  <TableHead className="text-flora-ink">Price</TableHead>
                  <TableHead className="text-flora-ink">Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cartItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-flora-chip/20">
                    <TableCell>
                      <p className="font-medium text-flora-ink">{item.products?.title || 'Unknown Product'}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-flora-ink">{item.user_profile?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-flora-muted">{item.user_profile?.email}</p>
                    </TableCell>
                    <TableCell className="text-flora-muted">{item.quantity}</TableCell>
                    <TableCell className="text-flora-muted">₦{Number(item.products?.price || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-flora-muted">{new Date(item.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Sales Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
          <h2 className="text-lg font-bold text-flora-ink">Revenue Overview</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-flora-muted">Total Revenue</span>
              <span className="text-2xl font-bold text-flora-leaf">
                ₦{orderStats.totalRevenue.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-flora-muted">Average Order Value</span>
              <span className="text-lg font-semibold text-flora-ink">
                ₦{orderStats.totalOrders > 0 ? Math.round(orderStats.totalRevenue / orderStats.totalOrders).toLocaleString() : 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-flora-muted">Completion Rate</span>
              <span className="text-lg font-semibold text-flora-ink">
                {orderStats.totalOrders > 0 ? Math.round((orderStats.completedOrders / orderStats.totalOrders) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
        <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
          <h2 className="text-lg font-bold text-flora-ink">Platform Metrics</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-flora-muted">Active Sellers</span>
              <span className="text-lg font-semibold text-flora-ink">{topSellers.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-flora-muted">Cart Conversion</span>
              <span className="text-lg font-semibold text-flora-ink">
                {orderStats.cartItems > 0 ? Math.round((orderStats.totalOrders / orderStats.cartItems) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-flora-muted">Pending Orders</span>
              <span className="text-lg font-semibold text-amber-600">
                {orderStats.pendingOrders}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
