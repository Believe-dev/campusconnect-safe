import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Package, Truck, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import Header from '@/components/layout/Header';

interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  total_amount: number;
  status: string;
  payment_method?: string;
  shipping_address?: string;
  tracking_info?: string;
  created_at: string;
  confirmed_at?: string;
  auto_confirm_at?: string;
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
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('buyer');
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          products:product_id (title, images),
          seller_profile:seller_id (full_name),
          buyer_profile:buyer_id (full_name)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, trackingInfo?: string) => {
    try {
      const updateData: any = { status };
      if (trackingInfo) updateData.tracking_info = trackingInfo;
      if (status === 'confirmed') updateData.confirmed_at = new Date().toISOString();

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Order Updated",
        description: `Order status updated to ${status}`,
      });
      
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
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

  const renderOrderCard = (order: Order, isSeller: boolean = false) => (
    <Card key={order.id} className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold">{order.product?.title}</h3>
              <Badge variant={getStatusVariant(order.status) as any}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(order.status)}
                  {order.status}
                </span>
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {isSeller ? `Buyer: ${order.buyer?.full_name}` : `Seller: ${order.seller?.full_name}`}
            </p>
            <p className="text-sm text-muted-foreground">
              Quantity: {order.quantity} • Total: ₦{order.total_amount.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Ordered on {new Date(order.created_at).toLocaleDateString()}
            </p>
            
            {order.tracking_info && (
              <p className="text-sm text-muted-foreground mt-2">
                Tracking: {order.tracking_info}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {isSeller ? (
              // Seller actions
              <>
                {order.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => updateOrderStatus(order.id, 'shipped', 'Package dispatched')}
                  >
                    Mark as Shipped
                  </Button>
                )}
                {order.status === 'shipped' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                  >
                    Mark as Delivered
                  </Button>
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
                    >
                      Confirm Receipt
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateOrderStatus(order.id, 'disputed')}
                    >
                      Report Issue
                    </Button>
                  </div>
                )}
                {order.auto_confirm_at && order.status !== 'confirmed' && (
                  <p className="text-xs text-muted-foreground">
                    Auto-confirms on {new Date(order.auto_confirm_at).toLocaleDateString()}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
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
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-primary mb-6">My Orders</h1>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buyer">As Buyer</TabsTrigger>
              <TabsTrigger value="seller">As Seller</TabsTrigger>
            </TabsList>

            <TabsContent value="buyer" className="mt-6">
              <div>
                {orders.filter(order => {
                  // We need to check current user ID
                  return true; // Temporary - will be filtered properly
                }).length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium">No orders yet</p>
                      <p className="text-muted-foreground">Start shopping to see your orders here</p>
                    </CardContent>
                  </Card>
                ) : (
                  orders.map(order => renderOrderCard(order, false))
                )}
              </div>
            </TabsContent>

            <TabsContent value="seller" className="mt-6">
              <div>
                {orders.filter(order => {
                  // We need to check current user ID
                  return true; // Temporary - will be filtered properly  
                }).length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium">No sales yet</p>
                      <p className="text-muted-foreground">Start selling to see your orders here</p>
                    </CardContent>
                  </Card>
                ) : (
                  orders.map(order => renderOrderCard(order, true))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Orders;