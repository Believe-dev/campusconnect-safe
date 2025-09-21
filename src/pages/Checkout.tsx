import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { SAFE_PROFILE_SELECT } from "@/lib/profileSecurity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard,
  MapPin,
  Package,
  Lock,
  ArrowLeft,
  CheckCircle,
  Shield,
  Info,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { User } from "@supabase/supabase-js";

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
  universityName: string;
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
    fullName: "",
    email: "",
    phone: "",
    universityName: "",
    address: "",
    city: "",
    state: "",
    paymentMethod: "paystack",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);

      // Fetch user profile to pre-fill form (user can see their own email)
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone_number, university_name, campus")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setFormData((prev) => ({
          ...prev,
          fullName: profile.full_name || "",
          email: profile.email || user.email || "",
          phone: profile.phone_number || "",
          universityName: profile.university_name || "",
        }));
      }

      fetchCartItems(user.id);
    } catch (error) {
      console.error("Error checking auth:", error);
      navigate("/auth");
    }
  };

  const fetchCartItems = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("cart")
        .select(
          `
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
        `
        )
        .eq("user_id", userId);

      if (error) throw error;

      // Filter out items with null products
      const validItems = (data || []).filter(item => item.products && item.products.id);
      
      if (validItems.length === 0) {
        toast({
          title: "Empty cart",
          description: "Your cart is empty. Add some items first.",
          variant: "destructive",
        });
        navigate("/marketplace");
        return;
      }

      setCartItems(validItems);
    } catch (error) {
      console.error("Error fetching cart items:", error);
      navigate("/cart");
    } finally {
      setLoading(false);
    }
  };

  const getTotalPrice = () => {
    return cartItems
      .filter(item => item.products?.price)
      .reduce(
        (total, item) => total + (item.products?.price || 0) * item.quantity,
        0
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
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const required = ["fullName", "email", "phone", "universityName", "address", "city", "state"];
    for (const field of required) {
      if (!formData[field as keyof CheckoutForm]) {
        toast({
          title: "Missing Information",
          description: `Please fill in your ${field
            .replace(/([A-Z])/g, " $1")
            .toLowerCase()}`,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const handlePayment = () => {
    console.log('Payment button clicked');
    
    if (!validateForm() || !user) {
      console.log('Form validation failed or no user');
      return;
    }

    console.log('PaystackPop available:', !!(window as any).PaystackPop);
    
    if (!(window as any).PaystackPop) {
      toast({
        title: "Payment Error",
        description: "Paystack not loaded. Check your internet connection and refresh.",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = getFinalTotal() * 100;
    const paymentRef = `CC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Initializing payment:', { totalAmount, paymentRef, email: formData.email });

    try {
      const handler = (window as any).PaystackPop.setup({
        key: "pk_test_5fdf1c7e08e4950078f88266e68ede32e832baf7",
        email: formData.email,
        amount: totalAmount,
        currency: "NGN",
        ref: paymentRef,
        callback: (response: any) => {
          console.log('Payment callback:', response);
          if (response.status === "success") {
            processOrder(response.reference);
          } else {
            toast({
              title: "Payment Failed",
              description: "Payment was not successful. Please try again.",
              variant: "destructive",
            });
          }
        },
        onClose: () => {
          console.log("Payment popup closed");
        },
      });

      console.log('Opening payment popup');
      handler.openIframe();
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const processOrder = async (paymentRef: string) => {
    setProcessing(true);

    try {
      // Group items by seller (filter out items with null products)
      const validCartItems = cartItems.filter(item => item.products?.seller_id);
      const sellerGroups = validCartItems.reduce((groups, item) => {
        const sellerId = item.products.seller_id;
        if (!groups[sellerId]) {
          groups[sellerId] = [];
        }
        groups[sellerId].push(item);
        return groups;
      }, {} as Record<string, CartItem[]>);

      // Create orders for each seller
      const orderPromises = Object.entries(sellerGroups).map(
        async ([sellerId, items]) => {
          const orderTotal = items.reduce(
            (sum, item) => sum + (item.products?.price || 0) * item.quantity,
            0
          );

          const totalAmount =
            orderTotal + getDeliveryFee() / Object.keys(sellerGroups).length;
          const commissionRate = 0.05;
          const commissionAmount = totalAmount * commissionRate;

          const { data: order, error: orderError } = await supabase
            .from("orders")
            .insert({
              buyer_id: user!.id,
              seller_id: sellerId,
              product_id: items[0].products.id,
              quantity: items.reduce((sum, item) => sum + item.quantity, 0),
              total_amount: totalAmount,
              commission_amount: commissionAmount,
              shipping_address: `${formData.address}, ${formData.city}, ${formData.state}`,
              university_name: formData.universityName,
              payment_method: "paystack",
              payment_reference: paymentRef,
              status: "paid",
              auto_confirm_at: new Date(
                Date.now() + 2 * 24 * 60 * 60 * 1000
              ).toISOString(),
            })
            .select()
            .single();

          if (orderError) throw orderError;

          // Send notifications to seller and buyer
          const { data: sellerProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', sellerId)
            .single();

          const { data: buyerProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', user!.id)
            .single();

          const productTitles = items
            .filter(i => i.products?.title)
            .map(i => i.products.title)
            .join(', ');

          if (sellerProfile) {
            // Create in-app notification for seller
            console.log('Creating seller notification for user:', sellerId);
            const { data: sellerNotification, error: sellerNotifError } = await supabase.from('notifications').insert({
              user_id: sellerId,
              title: 'New Order Received! 🎉',
              message: `You have a new order for ${productTitles}. Total: ₦${orderTotal.toLocaleString()}`,
              type: 'success'
            });
            
            if (sellerNotifError) {
              console.error('Error creating seller notification:', sellerNotifError);
            } else {
              console.log('Seller notification created successfully:', sellerNotification);
            }

            // Send email notification to seller
            try {
              await supabase.functions.invoke('send-email', {
                body: {
                  to: sellerProfile.email,
                  subject: 'New Order Received - CampusConnect',
                  html: `
                    <h2>New Order Received!</h2>
                    <p>Hello ${sellerProfile.full_name},</p>
                    <p>You have received a new order:</p>
                    <ul>
                      <li><strong>Products:</strong> ${productTitles}</li>
                      <li><strong>Buyer:</strong> ${buyerProfile?.full_name || 'Unknown'}</li>
                      <li><strong>Total Amount:</strong> ₦${orderTotal.toLocaleString()}</li>
                      <li><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</li>
                    </ul>
                    <p><strong>⚠️ Important:</strong> Payment will be automatically released in 2 days if the buyer doesn't confirm receipt.</p>
                    <p>Please log in to your dashboard to manage this order.</p>
                    <p>Best regards,<br>CampusConnect Team</p>
                  `
                }
              });
            } catch (emailError) {
              console.error('Failed to send email to seller:', emailError);
            }
          }

          // Create in-app notification for buyer
          console.log('Creating buyer notification for user:', user!.id);
          const { data: buyerNotification, error: buyerNotifError } = await supabase.from('notifications').insert({
            user_id: user!.id,
            title: 'Order Placed Successfully! ✅',
            message: `Your order for ${productTitles} has been placed. Total: ₦${orderTotal.toLocaleString()}`,
            type: 'success'
          });
          
          if (buyerNotifError) {
            console.error('Error creating buyer notification:', buyerNotifError);
          } else {
            console.log('Buyer notification created successfully:', buyerNotification);
          }

          // Send email confirmation to buyer
          if (buyerProfile) {
            try {
              await supabase.functions.invoke('send-email', {
                body: {
                  to: buyerProfile.email,
                  subject: 'Order Confirmation - CampusConnect',
                  html: `
                    <h2>Order Confirmation</h2>
                    <p>Hello ${buyerProfile.full_name},</p>
                    <p>Your order has been successfully placed:</p>
                    <ul>
                      <li><strong>Products:</strong> ${productTitles}</li>
                      <li><strong>Seller:</strong> ${sellerProfile?.full_name || 'Unknown'}</li>
                      <li><strong>Total Amount:</strong> ₦${orderTotal.toLocaleString()}</li>
                      <li><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</li>
                    </ul>
                    <p>You can track your order in your account dashboard.</p>
                    <p>Best regards,<br>CampusConnect Team</p>
                  `
                }
              });
            } catch (emailError) {
              console.error('Failed to send email to buyer:', emailError);
            }
          }

          return order;
        }
      );

      await Promise.all(orderPromises);

      // Clear cart
      await supabase.from("cart").delete().eq("user_id", user!.id);

      // Update analytics
      for (const item of cartItems.filter(item => item.products?.id)) {
        await updateAnalytics(item.products.id, "orders_count", item.quantity);
        await updateAnalytics(
          item.products.id,
          "revenue",
          (item.products?.price || 0) * item.quantity
        );
      }

      toast({
        title: "Payment successful!",
        description: "Your order has been placed and payment confirmed.",
      });

      navigate("/orders");
    } catch (error) {
      console.error("Error processing order:", error);
      toast({
        title: "Order failed",
        description:
          "Payment successful but order processing failed. Contact support.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!processing) {
      handlePayment();
    }
  };

  const updateAnalytics = async (
    productId: string,
    field: string,
    increment: number
  ) => {
    try {
      const { data: existing } = await supabase
        .from("product_analytics")
        .select(field)
        .eq("product_id", productId)
        .single();

      if (existing) {
        await supabase
          .from("product_analytics")
          .update({
            [field]: existing[field] + increment,
            last_updated: new Date().toISOString(),
          })
          .eq("product_id", productId);
      }
    } catch (error) {
      // Silently fail analytics to not block order processing
      console.error("Error updating analytics:", error);
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
      <main className="container mx-auto px-4 py-6 sm:py-8 pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-6 sm:mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/cart")}
              className="h-9 w-9 sm:h-10 sm:w-10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">Checkout</h1>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Checkout Form */}
              <div className="space-y-4 sm:space-y-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <Label htmlFor="fullName" className="text-sm sm:text-base">Full Name *</Label>
                        <Input
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) =>
                            handleInputChange("fullName", e.target.value)
                          }
                          required
                          className="text-sm sm:text-base"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-sm sm:text-base">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            handleInputChange("email", e.target.value)
                          }
                          required
                          className="text-sm sm:text-base"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-sm sm:text-base">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        placeholder="+234 801 234 5678"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="universityName" className="text-sm sm:text-base">University Name *</Label>
                      <Input
                        id="universityName"
                        value={formData.universityName}
                        onChange={(e) =>
                          handleInputChange("universityName", e.target.value)
                        }
                        placeholder="Enter your university name"
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
                        onChange={(e) =>
                          handleInputChange("address", e.target.value)
                        }
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
                          onChange={(e) =>
                            handleInputChange("city", e.target.value)
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Select
                          value={formData.state}
                          onValueChange={(value) =>
                            handleInputChange("state", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Abia">Abia</SelectItem>
                            <SelectItem value="Adamawa">Adamawa</SelectItem>
                            <SelectItem value="Akwa Ibom">Akwa Ibom</SelectItem>
                            <SelectItem value="Anambra">Anambra</SelectItem>
                            <SelectItem value="Bauchi">Bauchi</SelectItem>
                            <SelectItem value="Bayelsa">Bayelsa</SelectItem>
                            <SelectItem value="Benue">Benue</SelectItem>
                            <SelectItem value="Borno">Borno</SelectItem>
                            <SelectItem value="Cross River">Cross River</SelectItem>
                            <SelectItem value="Delta">Delta</SelectItem>
                            <SelectItem value="Ebonyi">Ebonyi</SelectItem>
                            <SelectItem value="Edo">Edo</SelectItem>
                            <SelectItem value="Ekiti">Ekiti</SelectItem>
                            <SelectItem value="Enugu">Enugu</SelectItem>
                            <SelectItem value="FCT">FCT (Abuja)</SelectItem>
                            <SelectItem value="Gombe">Gombe</SelectItem>
                            <SelectItem value="Imo">Imo</SelectItem>
                            <SelectItem value="Jigawa">Jigawa</SelectItem>
                            <SelectItem value="Kaduna">Kaduna</SelectItem>
                            <SelectItem value="Kano">Kano</SelectItem>
                            <SelectItem value="Katsina">Katsina</SelectItem>
                            <SelectItem value="Kebbi">Kebbi</SelectItem>
                            <SelectItem value="Kogi">Kogi</SelectItem>
                            <SelectItem value="Kwara">Kwara</SelectItem>
                            <SelectItem value="Lagos">Lagos</SelectItem>
                            <SelectItem value="Nasarawa">Nasarawa</SelectItem>
                            <SelectItem value="Niger">Niger</SelectItem>
                            <SelectItem value="Ogun">Ogun</SelectItem>
                            <SelectItem value="Ondo">Ondo</SelectItem>
                            <SelectItem value="Osun">Osun</SelectItem>
                            <SelectItem value="Oyo">Oyo</SelectItem>
                            <SelectItem value="Plateau">Plateau</SelectItem>
                            <SelectItem value="Rivers">Rivers</SelectItem>
                            <SelectItem value="Sokoto">Sokoto</SelectItem>
                            <SelectItem value="Taraba">Taraba</SelectItem>
                            <SelectItem value="Yobe">Yobe</SelectItem>
                            <SelectItem value="Zamfara">Zamfara</SelectItem>
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
                      onValueChange={(value) =>
                        handleInputChange("paymentMethod", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paystack">
                          Paystack (Card/Bank/Transfer)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      Secure payment via Paystack - supports cards, bank
                      transfers, and USSD
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
                      {cartItems.filter(item => item.products?.id).map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          {item.products?.images?.[0] && (
                            <img
                              src={item.products.images[0]}
                              alt={item.products?.title || 'Product image'}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-sm line-clamp-1">
                              {item.products?.title || 'Unknown Product'}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              by {item.products?.profiles?.full_name || 'Unknown Seller'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Qty: {item.quantity}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              ₦
                              {(
                                (item.products?.price || 0) * item.quantity
                              ).toLocaleString()}
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
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Info className="h-3 w-3" />
                        <span>Platform fee (5%) deducted from seller</span>
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
                          Pay with Paystack
                        </>
                      )}
                    </Button>

                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-1 text-xs text-green-600">
                        <Shield className="h-3 w-3" />
                        <span>Protected by Escrow System</span>
                      </div>
                      <div className="text-xs text-muted-foreground text-center">
                        <Lock className="h-3 w-3 inline mr-1" />
                        Your payment is held securely until you confirm receipt
                      </div>
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
