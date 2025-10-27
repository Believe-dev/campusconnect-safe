import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, TrendingUp, BarChart3, RefreshCw, Users, DollarSign, ShoppingCart, CheckCircle } from 'lucide-react';
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
  created_at: string;
  buyer_profile: { full_name: string; email: string };
  seller_profile: { full_name: string; email: string };
  products: { title: string; price: number };
  escrow_transactions?: {
    id: string;
    status: string;
    seller_amount: number;
  }[];
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
      // Fetch order counts
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('status, total_amount');

      if (ordersError) throw ordersError;

      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
      const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      // Fetch cart items count
      const { data: cart, error: cartError } = await supabase
        .from('cart_items')
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

  const fetchRecentOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          buyer_id,
          seller_id,
          product_id,
          buyer_profile:profiles!orders_buyer_id_fkey(full_name, email),
          seller_profile:profiles!orders_seller_id_fkey(full_name, email),
          products(title, price),
          escrow_transactions(id, status, seller_amount)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentOrders(data || []);
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
      const { data, error } = await supabase
        .from('orders')
        .select(`
          seller_id,
          total_amount,
          seller_profile:profiles!orders_seller_id_fkey(full_name, email, rating)
        `)
        .eq('status', 'completed');

      if (error) throw error;

      // Group by seller and calculate totals
      const sellerMap = new Map();
      data?.forEach(order => {
        const sellerId = order.seller_id;
        if (!sellerMap.has(sellerId)) {
          sellerMap.set(sellerId, {
            seller_id: sellerId,
            full_name: order.seller_profile?.full_name || 'Unknown',
            email: order.seller_profile?.email || 'Unknown',
            rating: order.seller_profile?.rating || 0,
            total_sales: 0,
            total_orders: 0,
          });
        }
        const seller = sellerMap.get(sellerId);
        seller.total_sales += Number(order.total_amount);
        seller.total_orders += 1;
      });

      const topSellersArray = Array.from(sellerMap.values())
        .sort((a, b) => b.total_sales - a.total_sales)
        .slice(0, 5);

      setTopSellers(topSellersArray);
    } catch (error) {
      console.error('Error fetching top sellers:', error);
      setTopSellers([]);
    }
  };

  const fetchCartItems = async () => {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          created_at,
          user_id,
          product_id,
          user_profile:profiles!cart_items_user_id_fkey(full_name, email),
          products(title, price, seller_id)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCartItems(data || []);
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
      {/* Order Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cart Items</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats.cartItems}</div>
            <p className="text-xs text-muted-foreground">Items in carts</p>
          </CardContent>
        </Card>
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

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <p className="text-sm text-muted-foreground">Latest orders with buyer and seller details</p>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground">Orders will appear here once customers start purchasing</p>
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
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        #{order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.products?.title || 'Unknown Product'}</p>
                          <p className="text-sm text-muted-foreground">
                            ₦{order.products?.price?.toLocaleString() || 0}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.buyer_profile?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{order.buyer_profile?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.seller_profile?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{order.seller_profile?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">₦{Number(order.total_amount).toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          order.status === 'completed' ? 'default' :
                          order.status === 'pending' ? 'secondary' :
                          order.status === 'cancelled' ? 'destructive' : 'outline'
                        }>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {order.status === 'paid' && order.escrow_transactions && 
                         order.escrow_transactions.length > 0 && 
                         order.escrow_transactions[0].status === 'held' ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Release Funds
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Release Escrow Funds</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to release the escrow funds for this order? 
                                  This will transfer ₦{order.escrow_transactions[0].seller_amount.toLocaleString()} to the seller 
                                  and change the order status to "confirmed".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => releaseFunds(order.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Release Funds
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : order.status === 'confirmed' ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Funds Released
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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