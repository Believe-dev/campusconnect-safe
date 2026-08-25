import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, TrendingUp, RefreshCw, ShoppingCart, CheckCircle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

export const OrdersTab: React.FC = () => {
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrdersData();
  }, []);

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
      const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
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

  const filteredOrders = useMemo(() =>
    statusFilter === 'all' ? recentOrders : recentOrders.filter(o => o.status === statusFilter)
  , [recentOrders, statusFilter]);

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

      // Release escrow funds
      const { data, error } = await supabase.rpc('release_escrow_funds', {
        escrow_id: escrowTransaction.id
      });

      if (error) throw error;

      if (data === false) {
        toast.error('Failed to release funds - escrow transaction not found or already released');
        return;
      }

      // Update order status to confirmed
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', orderId);

      if (orderError) {
        console.error('Error updating order status:', orderError);
        // Don't throw here as funds were already released
      }

      toast.success('Funds released successfully and order status updated to confirmed');
      
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
        .eq('status', 'completed');

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
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
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
          { label: 'Total Orders', value: orderStats.totalOrders, filter: 'all', sub: 'All time orders', icon: <Package className="h-4 w-4 text-muted-foreground" /> },
          { label: 'Pending Orders', value: orderStats.pendingOrders, filter: 'pending', sub: 'Awaiting processing', icon: <Package className="h-4 w-4 text-orange-500" /> },
          { label: 'Completed Orders', value: orderStats.completedOrders, filter: 'completed', sub: 'Successfully delivered', icon: <Package className="h-4 w-4 text-green-500" /> },
          { label: 'Cart Items', value: orderStats.cartItems, filter: null, sub: 'Items in carts', icon: <ShoppingCart className="h-4 w-4 text-blue-500" /> },
        ].map(({ label, value, filter, sub, icon }) => (
          <Card
            key={label}
            onClick={() => filter && setStatusFilter(filter)}
            className={filter ? 'cursor-pointer transition-all hover:ring-2 hover:ring-primary' + (statusFilter === filter ? ' ring-2 ring-primary' : '') : ''}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              {icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Performing Sellers */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Top Performing Sellers</CardTitle>
            <Button onClick={fetchOrdersData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Sellers with highest sales and ratings</p>
        </CardHeader>
        <CardContent>
          {topSellers.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sales data available</h3>
              <p className="text-muted-foreground">Sales analytics will appear here once orders are placed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Sales</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSellers.map((seller, index) => (
                    <TableRow key={seller.seller_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={index === 0 ? "default" : "outline"}>
                            #{index + 1}
                          </Badge>
                          <span className="font-medium">{seller.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{seller.email}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-600">
                          ₦{seller.total_sales.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>{seller.total_orders}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{seller.rating.toFixed(1)}</span>
                          <span className="text-yellow-500">★</span>
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

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                {statusFilter === 'all' ? 'All Orders' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Orders`}
                <span className="ml-2 text-sm font-normal text-muted-foreground">({filteredOrders.length})</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Click a stat card above to filter, or choose a status below</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-9 px-3 border border-input bg-background rounded-md text-sm"
              >
                {['all','pending','paid','shipped','delivered','confirmed','disputed','cancelled','refunded'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              <Button onClick={fetchOrdersData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No {statusFilter === 'all' ? '' : statusFilter} orders</h3>
              <p className="text-muted-foreground">No orders match this filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">#{order.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <p className="font-medium">{order.products?.title || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">₦{Number(order.products?.price || 0).toLocaleString()}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{order.buyer_profile?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{order.buyer_profile?.email}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{order.seller_profile?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{order.seller_profile?.email}</p>
                      </TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell className="font-semibold">₦{Number(order.total_amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          order.status === 'confirmed' || order.status === 'completed' ? 'default' :
                          order.status === 'pending' ? 'secondary' :
                          order.status === 'cancelled' || order.status === 'refunded' ? 'destructive' : 'outline'
                        }>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          {order.status === 'paid' && order.escrow_transactions.length > 0 && order.escrow_transactions[0].status === 'held' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />Release
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Release Escrow Funds</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Release ₦{order.escrow_transactions[0].seller_amount.toLocaleString()} to {order.seller_profile?.full_name}? Order status will change to confirmed.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => releaseFunds(order.id)} className="bg-green-600 hover:bg-green-700">
                                    Release Funds
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {order.status === 'confirmed' && (
                            <Badge className="bg-green-100 text-green-800 text-xs">Released</Badge>
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

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details — #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                  <Badge variant={
                    selectedOrder.status === 'confirmed' || selectedOrder.status === 'completed' ? 'default' :
                    selectedOrder.status === 'pending' ? 'secondary' :
                    selectedOrder.status === 'cancelled' ? 'destructive' : 'outline'
                  }>{selectedOrder.status}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Date</p>
                  <p>{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="rounded-md border p-3 space-y-1">
                <p className="font-semibold">Product</p>
                <p>{selectedOrder.products?.title || 'Unknown'}</p>
                <p className="text-muted-foreground">Unit price: ₦{Number(selectedOrder.products?.price || 0).toLocaleString()}</p>
                <p className="text-muted-foreground">Qty: {selectedOrder.quantity}</p>
                <p className="font-medium">Total: ₦{Number(selectedOrder.total_amount).toLocaleString()}</p>
              </div>

              <div className="rounded-md border p-3 space-y-1">
                <p className="font-semibold">Buyer</p>
                <p>{selectedOrder.buyer_profile?.full_name || 'Unknown'}</p>
                <p className="text-muted-foreground">{selectedOrder.buyer_profile?.email}</p>
              </div>

              <div className="rounded-md border p-3 space-y-1">
                <p className="font-semibold">Seller</p>
                <p>{selectedOrder.seller_profile?.full_name || 'Unknown'}</p>
                <p className="text-muted-foreground">{selectedOrder.seller_profile?.email}</p>
              </div>

              {selectedOrder.shipping_address && (
                <div className="rounded-md border p-3 space-y-1">
                  <p className="font-semibold">Shipping Address</p>
                  <p className="text-muted-foreground">{selectedOrder.shipping_address}</p>
                </div>
              )}

              {selectedOrder.payment_method && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment Method</p>
                    <p>{selectedOrder.payment_method}</p>
                  </div>
                  {selectedOrder.payment_reference && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Reference</p>
                      <p className="font-mono text-xs">{selectedOrder.payment_reference}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedOrder.escrow_transactions.length > 0 && (
                <div className="rounded-md border p-3 space-y-1">
                  <p className="font-semibold">Escrow</p>
                  <p>Status: <Badge variant="outline">{selectedOrder.escrow_transactions[0].status}</Badge></p>
                  <p className="text-muted-foreground">Seller amount: ₦{Number(selectedOrder.escrow_transactions[0].seller_amount).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Shopping Cart Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Shopping Cart Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">Products currently in user carts</p>
        </CardHeader>
        <CardContent>
          {cartItems.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No cart data available</h3>
              <p className="text-muted-foreground">Cart analytics will show products users are interested in</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cartItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.products?.title || 'Unknown Product'}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.user_profile?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{item.user_profile?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₦{Number(item.products?.price || 0).toLocaleString()}</TableCell>
                      <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Revenue</span>
                <span className="text-2xl font-bold text-green-600">
                  ₦{orderStats.totalRevenue.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Order Value</span>
                <span className="text-lg font-semibold">
                  ₦{orderStats.totalOrders > 0 ? Math.round(orderStats.totalRevenue / orderStats.totalOrders).toLocaleString() : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Completion Rate</span>
                <span className="text-lg font-semibold">
                  {orderStats.totalOrders > 0 ? Math.round((orderStats.completedOrders / orderStats.totalOrders) * 100) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Platform Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Sellers</span>
                <span className="text-lg font-semibold">{topSellers.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cart Conversion</span>
                <span className="text-lg font-semibold">
                  {orderStats.cartItems > 0 ? Math.round((orderStats.totalOrders / orderStats.cartItems) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pending Orders</span>
                <span className="text-lg font-semibold text-orange-600">
                  {orderStats.pendingOrders}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};