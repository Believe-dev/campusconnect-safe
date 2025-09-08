import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { SAFE_PROFILE_SELECT } from '@/lib/profileSecurity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  MapPin, 
  Package,
  Lock,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { User } from '@supabase/supabase-js';

interface CartItem {
  id: string;
  quantity: number;
  products: {
    id: string;
    title: string;
    price: number;
    images: string[];
    seller_id: string;
    profiles: {
      full_name: string;
    };
  };
}

interface CheckoutForm {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  paymentMethod: string;
}

const Checkout = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState<CheckoutForm>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    paymentMethod: 'bank_transfer'
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
      
      // Fetch user profile to pre-fill form (user can see their own email)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone_number, university_name, campus')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setFormData(prev => ({
          ...prev,
          fullName: profile.full_name || '',
          email: profile.email || user.email || '',
          phone: profile.phone_number || ''
        }));
      }

      fetchCartItems(user.id);
    } catch (error) {
      console.error('Error checking auth:', error);
      navigate('/auth');
    }
  };

  const fetchCartItems = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('cart')
        .select(`
          *,
          products (
            id,
            title,
            price,
            images,
            seller_id,
            profiles!products_seller_id_fkey (
              full_name
            )
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Empty cart",
          description: "Your cart is empty. Add some items first.",
          variant: "destructive",
        });
        navigate('/marketplace');
        return;
      }

      setCartItems(data);
    } catch (error) {
      console.error('Error fetching cart items:', error);
      navigate('/cart');
    } finally {
      setLoading(false);
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => 
      total + (item.products.price * item.quantity), 0
    );
  };

  const getDeliveryFee = () => {
    // Simple delivery fee calculation
    return 2000; // ₦2,000 flat rate
  };

  const getFinalTotal = () => {
    return getTotalPrice() + getDeliveryFee();
  };

  const handleInputChange = (field: keyof CheckoutForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const required = ['fullName', 'email', 'phone', 'address', 'city', 'state'];
    for (const field of required) {
      if (!formData[field as keyof CheckoutForm]) {
        toast({
          title: "Missing Information",
          description: `Please fill in your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user) return;

    setProcessing(true);

    try {
      // Group items by seller
      const sellerGroups = cartItems.reduce((groups, item) => {
        const sellerId = item.products.seller_id;
        if (!groups[sellerId]) {
          groups[sellerId] = [];
        }
        groups[sellerId].push(item);
        return groups;
      }, {} as Record<string, CartItem[]>);

      // Create orders for each seller
      const orderPromises = Object.entries(sellerGroups).map(async ([sellerId, items]) => {
        const orderTotal = items.reduce((sum, item) => 
          sum + (item.products.price * item.quantity), 0
        );

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            buyer_id: user.id,
            seller_id: sellerId,
            product_id: items[0].products.id, // Primary product
            quantity: items.reduce((sum, item) => sum + item.quantity, 0),
            total_amount: orderTotal + (getDeliveryFee() / Object.keys(sellerGroups).length), // Split delivery
            shipping_address: `${formData.address}, ${formData.city}, ${formData.state}`,
            payment_method: formData.paymentMethod,
            status: 'pending'
          })
          .select()
          .single();

        if (orderError) throw orderError;
        return order;
      });

      const orders = await Promise.all(orderPromises);

      // Clear cart
      await supabase
        .from('cart')
        .delete()
        .eq('user_id', user.id);

      // Update analytics
      for (const item of cartItems) {
        await updateAnalytics(item.products.id, 'orders_count', item.quantity);
        await updateAnalytics(item.products.id, 'revenue', item.products.price * item.quantity);
      }

      toast({
        title: "Order placed successfully!",
        description: `${orders.length} order${orders.length > 1 ? 's' : ''} created. You'll receive confirmation soon.`,
      });

      navigate('/orders');
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: "Order failed",
        description: "There was an error placing your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const updateAnalytics = async (productId: string, field: string, increment: number) => {
    try {
      const { data: existing } = await supabase
        .from('product_analytics')
        .select(field)
        .eq('product_id', productId)
        .single();

      if (existing) {
        await supabase
          .from('product_analytics')
          .update({ 
            [field]: existing[field] + increment,
            last_updated: new Date().toISOString()
          })
          .eq('product_id', productId);
      }
    } catch (error) {
      console.error('Error updating analytics:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
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
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate('/cart')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold text-primary">Checkout</h1>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Checkout Form */}
              <div className="space-y-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+234 801 234 5678"
                        required
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Delivery Address */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Delivery Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="address">Street Address *</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Enter your full address"
                        rows={3}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Select 
                          value={formData.state} 
                          onValueChange={(value) => handleInputChange('state', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Lagos">Lagos</SelectItem>
                            <SelectItem value="Abuja">Abuja</SelectItem>
                            <SelectItem value="Kano">Kano</SelectItem>
                            <SelectItem value="Rivers">Rivers</SelectItem>
                            <SelectItem value="Oyo">Oyo</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Method */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select 
                      value={formData.paymentMethod} 
                      onValueChange={(value) => handleInputChange('paymentMethod', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="card">Debit/Credit Card</SelectItem>
                        <SelectItem value="cash_on_delivery">Cash on Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      Payment instructions will be provided after order confirmation
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary */}
              <div>
                <Card className="sticky top-4">
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          {item.products.images && item.products.images[0] && (
                            <img
                              src={item.products.images[0]}
                              alt={item.products.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-sm line-clamp-1">
                              {item.products.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              by {item.products.profiles?.full_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Qty: {item.quantity}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              ₦{(item.products.price * item.quantity).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>₦{getTotalPrice().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Delivery</span>
                        <span>₦{getDeliveryFee().toLocaleString()}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>₦{getFinalTotal().toLocaleString()}</span>
                    </div>

                    <Button 
                      type="submit"
                      variant="brand" 
                      className="w-full"
                      disabled={processing}
                    >
                      {processing ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Place Order
                        </>
                      )}
                    </Button>

                    <div className="text-xs text-muted-foreground text-center">
                      <Lock className="h-3 w-3 inline mr-1" />
                      Your payment information is secure and encrypted
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Checkout;