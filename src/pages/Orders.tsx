import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Package, Truck, CheckCircle, AlertCircle, Clock, Shield, Timer } from 'lucide-react';
import Header from '@/components/layout/Header';

interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  total_amount: number;
  commission_amount: number;
  status: string;
  payment_method?: string;
  shipping_address?: string;
  university_name?: string;
  tracking_info?: string;
  created_at: string;
  confirmed_at?: string;
  auto_confirm_at?: string;
  escrow_released?: boolean;
  product?: {
    title: string;
    images?: string[];
  };
  seller?: {
    full_name: string;
  };
  buyer?: {
    full_name: string;
  };
  escrow_transactions?: {
    id: string;
    status: string;
    seller_amount: number;
    auto_release_at?: string;
  }[];
}

const Orders = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('buyer');
  const [profile, setProfile] = useState<any>(null);
  const { toast } = useToast();
  const [offlineOrders, setOfflineOrders] = useOfflineStorage<Order[]>({
    key: `orders_${user?.id}`,
    defaultValue: [],
    ttl: 30 * 60 * 1000 // 30 minutes
  });

  // Fetch user profile to determine account type
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('user_id', user.id)
        .single();
      setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        products!inner (title, images),
        seller_profile:profiles!orders_seller_id_fkey (full_name),
        buyer_profile:profiles!orders_buyer_id_fkey (full_name),
        escrow_transactions (id, status, seller_amount, auto_release_at)
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform data to match expected structure
    const transformedOrders = (data || []).map(order => ({
      ...order,
      product: order.products,
      seller: order.seller_profile,
      buyer: order.buyer_profile
    }));
    
    // Store offline for next time
    setOfflineOrders(transformedOrders);
    return transformedOrders;
  };

  const { data: orders = offlineOrders, isLoading, error, refetch } = useOptimizedQuery({
    queryKey: ['orders', user?.id],
    queryFn: fetchOrders,
    enabled: !!user,
    placeholderData: offlineOrders
  });

  // Real-time order updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          // Check if this order involves the current user
          if (payload.new?.buyer_id === user.id || payload.new?.seller_id === user.id ||
              payload.old?.buyer_id === user.id || payload.old?.seller_id === user.id) {
            refetch();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const updateOrderStatus = async (orderId: string, status: string, trackingInfo?: string) => {
    try {
      const updateData: any = { status };
      if (trackingInfo) updateData.tracking_info = trackingInfo;

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Handle escrow release for confirmed orders
      if (status === 'confirmed') {
        try {
          const { error: escrowError } = await supabase.rpc('release_escrow_to_wallet', {
            order_id_param: orderId
          });
          
          if (escrowError) {
            console.error('Error releasing escrow:', escrowError);
            // Don't show error to user, just log it
          }
        } catch (escrowError) {
          console.error('Escrow release failed:', escrowError);
          // Continue with order confirmation even if escrow fails
        }
      }

      // Send notifications and emails for shipped/delivered status
      if (status === 'shipped' || status === 'delivered') {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          const { data: buyerProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', order.buyer_id)
            .single();

          if (buyerProfile) {
            const statusMessage = status === 'shipped' 
              ? 'Your order has been shipped! 📦'
              : 'Your order has been delivered! 🎉';
            
            const emailSubject = status === 'shipped'
              ? 'Order Shipped - CampusConnect'
              : 'Order Delivered - CampusConnect';

            // Create notification
            await supabase.from('notifications').insert({
              user_id: order.buyer_id,
              title: statusMessage,
              message: `Order for ${order.product?.title} has been ${status}. ${trackingInfo || ''}`,
              type: 'success'
            });

            // Send email
            try {
              await supabase.functions.invoke('send-email', {
                body: {
                  to: buyerProfile.email,
                  subject: emailSubject,
                  html: `
                    <h2>${statusMessage}</h2>
                    <p>Hello ${buyerProfile.full_name},</p>
                    <p>Your order has been ${status}:</p>
                    <ul>
                      <li><strong>Product:</strong> ${order.product?.title}</li>
                      <li><strong>Status:</strong> ${status.charAt(0).toUpperCase() + status.slice(1)}</li>
                      ${trackingInfo ? `<li><strong>Tracking:</strong> ${trackingInfo}</li>` : ''}
                    </ul>
                    <p>You can track your order in your account dashboard.</p>
                    <p>Best regards,<br>CampusConnect Team</p>
                  `
                }
              });
            } catch (emailError) {
              console.error('Failed to send email:', emailError);
            }
          }
        }
      }



      toast({
        title: "Order Updated",
        description: `Order status updated to ${status}`,
      });
      
      // Immediately refetch to update UI
      refetch();
    } catch (error) {
      console.error('Error updating order:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: error?.message || "Failed to update order",
        variant: "destructive",
      });
    }
  };

  const reportIssue = async (orderId: string, reason: string, description: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const order = orders.find(o => o.id === orderId);
      if (!order) {
        toast({
          title: "Error",
          description: "Order not found",
          variant: "destructive",
        });
        return;
      }

      // Just update order status to disputed
      await updateOrderStatus(orderId, 'disputed');

      toast({
        title: "Issue Reported",
        description: "Your issue has been reported and the order is now under review",
      });

    } catch (error) {
      console.error('Error reporting issue:', error);
      toast({
        title: "Error",
        description: "Failed to report issue. Please try again.",
        variant: "destructive",
      });
    }
  };

  const withdrawDispute = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'delivered');
      
      toast({
        title: "Dispute Withdrawn",
        description: "Your dispute has been withdrawn. Order status restored to delivered.",
      });
    } catch (error) {
      console.error('Error withdrawing dispute:', error);
      toast({
        title: "Error",
        description: "Failed to withdraw dispute",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'paid': return <Shield className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <Package className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'disputed': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'shipped': return 'outline';
      case 'delivered': return 'default';
      case 'confirmed': return 'default';
      case 'disputed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  };

  const getBuyerOrders = async () => {
    const user = await getCurrentUser();
    return orders.filter(order => order.buyer_id === user?.id);
  };

  const getSellerOrders = async () => {
    const user = await getCurrentUser();
    return orders.filter(order => order.seller_id === user?.id);
  };

  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  const renderOrderCard = (order: Order, isSeller: boolean = false) => {
    const escrow = order.escrow_transactions?.[0];
    const autoReleaseDate = escrow?.auto_release_at ? new Date(escrow.auto_release_at) : null;
    const daysUntilAutoRelease = autoReleaseDate ? Math.ceil((autoReleaseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

    return (
      <Card key={order.id} className="mb-3 sm:mb-4">
        <CardContent className="p-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <h3 className="font-semibold text-sm sm:text-base line-clamp-2">{order.product?.title}</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getStatusVariant(order.status) as any} className="text-xs">
                    <span className="flex items-center gap-1">
                      {getStatusIcon(order.status)}
                      {order.status}
                    </span>
                  </Badge>
                  {escrow && escrow.status === 'held' && (
                    <Badge variant="outline" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Escrow Protected</span>
                      <span className="sm:hidden">Protected</span>
                    </Badge>
                  )}
                </div>
              </div>
              
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {isSeller ? `Buyer: ${order.buyer?.full_name}` : `Seller: ${order.seller?.full_name}`}
              </p>
              <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                <p>Qty: {order.quantity} • Total: ₦{order.total_amount.toLocaleString()}</p>
                {isSeller && escrow && (
                  <p className="text-green-600 text-xs">
                    You'll receive: ₦{escrow.seller_amount.toLocaleString()}
                  </p>
                )}
                {isSeller && order.shipping_address && (
                  <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                    <p className="font-medium text-primary">📍 Shipping Details:</p>
                    <p>{order.shipping_address}</p>
                    {order.university_name && (
                      <p className="text-blue-600">🏫 {order.university_name}</p>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Ordered on {new Date(order.created_at).toLocaleDateString()}
              </p>
              
              {order.tracking_info && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  📦 Tracking: {order.tracking_info}
                </p>
              )}
              
              {daysUntilAutoRelease && daysUntilAutoRelease > 0 && order.status === 'delivered' && (
                <div className="flex items-center gap-1 mt-2 text-xs text-orange-600">
                  <Timer className="h-3 w-3" />
                  Auto-confirms in {daysUntilAutoRelease} day{daysUntilAutoRelease !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-col gap-2 w-full sm:w-auto">
              {isSeller ? (
                // Seller actions
                <>
                  {order.status === 'paid' && (
                    <Button
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, 'shipped', 'Package dispatched')}
                      className="w-full sm:w-auto text-xs sm:text-sm"
                    >
                      Mark as Shipped
                    </Button>
                  )}
                  {order.status === 'shipped' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateOrderStatus(order.id, 'delivered')}
                      className="w-full sm:w-auto text-xs sm:text-sm"
                    >
                      Mark as Delivered
                    </Button>
                  )}
                  {order.status === 'confirmed' && order.escrow_released && (
                    <Badge variant="default" className="text-center text-xs">
                      Payment Released
                    </Badge>
                  )}
                </>
              ) : (
                // Buyer actions
                <>
                  {order.status === 'delivered' && (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'confirmed')}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        ✅ Confirm Receipt
                      </Button>
                      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs sm:text-sm">
                            ❌ Report Issue
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-lg sm:text-xl">Report Issue</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3 sm:space-y-4">
                            <div>
                              <Label htmlFor="reason" className="text-sm sm:text-base">Reason</Label>
                              <select 
                                className="w-full p-2 border rounded text-sm sm:text-base"
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                              >
                                <option value="">Select a reason</option>
                                <option value="item_not_received">Item not received</option>
                                <option value="item_damaged">Item damaged</option>
                                <option value="wrong_item">Wrong item received</option>
                                <option value="not_as_described">Not as described</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="description" className="text-sm sm:text-base">Description</Label>
                              <Textarea
                                id="description"
                                placeholder="Please describe the issue in detail"
                                value={reportDescription}
                                onChange={(e) => setReportDescription(e.target.value)}
                                className="text-sm sm:text-base"
                              />
                            </div>
                            <Button 
                              onClick={() => {
                                reportIssue(order.id, reportReason, reportDescription);
                                setShowReportDialog(false);
                                setReportReason('');
                                setReportDescription('');
                              }}
                              className="w-full"
                              disabled={!reportReason || !reportDescription}
                            >
                              Submit Report
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                  {order.status === 'disputed' && (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => withdrawDispute(order.id)}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        Withdraw Dispute
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 sm:py-8 pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-4 sm:mb-6">My Orders</h1>

          {profile?.account_type === 'buyer' ? (
            // Buyer-only view
            <div>
              {orders.filter(order => order.buyer_id === user?.id).length === 0 ? (
                <Card>
                  <CardContent className="p-6 sm:pt-6 text-center">
                    <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                    <p className="text-base sm:text-lg font-medium">No orders yet</p>
                    <p className="text-sm sm:text-base text-muted-foreground">Start shopping to see your orders here</p>
                  </CardContent>
                </Card>
              ) : (
                orders.filter(order => order.buyer_id === user?.id).map(order => renderOrderCard(order, false))
              )}
            </div>
          ) : (
            // Seller view with tabs
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="buyer">As Buyer</TabsTrigger>
                <TabsTrigger value="seller">As Seller</TabsTrigger>
              </TabsList>

              <TabsContent value="buyer" className="mt-6">
                <div>
                  {orders.filter(order => order.buyer_id === user?.id).length === 0 ? (
                    <Card>
                      <CardContent className="p-6 sm:pt-6 text-center">
                        <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                        <p className="text-base sm:text-lg font-medium">No orders yet</p>
                        <p className="text-sm sm:text-base text-muted-foreground">Start shopping to see your orders here</p>
                      </CardContent>
                    </Card>
                  ) : (
                    orders.filter(order => order.buyer_id === user?.id).map(order => renderOrderCard(order, false))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="seller" className="mt-6">
                <div>
                  {orders.filter(order => order.seller_id === user?.id).length === 0 ? (
                    <Card>
                      <CardContent className="p-6 sm:pt-6 text-center">
                        <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                        <p className="text-base sm:text-lg font-medium">No sales yet</p>
                        <p className="text-sm sm:text-base text-muted-foreground">Start selling to see your orders here</p>
                      </CardContent>
                    </Card>
                  ) : (
                    orders.filter(order => order.seller_id === user?.id).map(order => renderOrderCard(order, true))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
};

export default Orders;