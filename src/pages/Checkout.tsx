import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/enhanced-button";
import { SAFE_PROFILE_SELECT } from "@/lib/profileSecurity";
import { API_CONFIG } from "@/lib/constants";
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
  Building2,
  Copy,
  Check,
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { processAnchorPayment, getVirtualAccount } from "@/services/anchorBaasService";
import { AnchorPaymentModal } from "@/components/checkout/AnchorPaymentModal";

interface CartItem {
  id: string;
  quantity: number;
  selected_size?: string;
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
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CheckoutForm>({
    fullName: "",
    email: "",
    phone: "",
    universityName: "",
    address: "",
    city: "",
    state: "",
    paymentMethod: "anchor_escrow",
  });
  const [payChannel, setPayChannel] = useState<"transfer" | "card">("transfer");
  const [nubanAccount, setNubanAccount] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
  });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
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
        .select("full_name, email, phone_number, university_name, campus, anchor_account_number")
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
        if (profile.anchor_account_number) {
          setNubanAccount(profile.anchor_account_number);
        } else {
          const userAnchor = await getVirtualAccount(user.id, profile.full_name);
          if (userAnchor?.account_number) {
            setNubanAccount(userAnchor.account_number);
          }
        }
      } else {
        const userAnchor = await getVirtualAccount(user.id);
        if (userAnchor?.account_number) {
          setNubanAccount(userAnchor.account_number);
        }
      }

      fetchCartItems(user.id);
    } catch (error) {
      navigate("/auth");
    }
  };

  const handleCopyNuban = () => {
    navigator.clipboard.writeText(nubanAccount);
    setCopied(true);
    toast({
      title: "Account Number Copied!",
      description: `${nubanAccount} copied to clipboard.`,
    });
    setTimeout(() => setCopied(false), 2500);
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
      const validItems = (data || []).filter(
        (item) => item.products && item.products.id
      );

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
      navigate("/cart");
    } finally {
      setLoading(false);
    }
  };

  const getTotalPrice = () => {
    return cartItems
      .filter((item) => item.products?.price)
      .reduce(
        (total, item) => total + (item.products?.price || 0) * item.quantity,
        0
      );
  };

  const getFinalTotal = () => {
    return getTotalPrice();
  };

  const handleInputChange = (field: keyof CheckoutForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const required = [
      "fullName",
      "email",
      "phone",
      "universityName",
      "address",
      "city",
      "state",
    ];
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
    if (!validateForm() || !user) {
      return;
    }
    // Open explicit Payment Channel modal popup so user chooses Bank Transfer or Card
    setIsPaymentModalOpen(true);
  };

  const handleConfirmModalPayment = (channel: "transfer" | "card") => {
    setIsPaymentModalOpen(false);
    const paymentRef = `ANCHOR_${channel.toUpperCase()}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;
    processOrder(paymentRef, "anchor_escrow");
  };

  const processOrder = async (paymentRef: string, methodOverride?: string) => {
    setProcessing(true);

    try {
      const selectedMethod = methodOverride || formData.paymentMethod || "anchor_escrow";

      // Group items by seller (filter out items with null products)
      const validCartItems = cartItems.filter(
        (item) => item.products?.seller_id
      );
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

          const totalAmount = orderTotal;
          const commissionAmount = 0; // No commission - sellers pay registration fee instead

          const { data: order, error: orderError } = await supabase
            .from("orders")
            .insert({
              buyer_id: user!.id,
              seller_id: sellerId,
              product_id: items[0].products.id,
              quantity: items.reduce((sum, item) => sum + item.quantity, 0),
              selected_size: items[0].selected_size || null,
              total_amount: totalAmount,
              commission_amount: commissionAmount,
              shipping_address: `${formData.address}, ${formData.city}, ${formData.state}`,
              university_name: formData.universityName,
              payment_method: selectedMethod,
              payment_reference: paymentRef,
              status: "paid",
              auto_confirm_at: new Date(
                Date.now() + 2 * 24 * 60 * 60 * 1000
              ).toISOString(),
            })
            .select()
            .single();

          if (orderError) throw orderError;

          if (selectedMethod === "anchor_escrow") {
            const anchorRes = await processAnchorPayment({
              orderId: order.id,
              buyerId: user!.id,
              sellerId,
              amount: totalAmount,
            });

            if (!anchorRes.success) {
              await supabase.from("orders").delete().eq("id", order.id);
              throw new Error(anchorRes.message);
            }
          }

          // Send notifications to seller and buyer
          const { data: sellerProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", sellerId)
            .single();

          const { data: buyerProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", user!.id)
            .single();

          const productTitles = items
            .filter((i) => i.products?.title)
            .map((i) => i.products.title)
            .join(", ");

          if (sellerProfile) {
            // Create in-app notification for seller
            try {
              const { sendOrderNotification } = await import('@/utils/notificationService');
              await sendOrderNotification(
                sellerId,
                "New Order Received! 🎉",
                `You have a new order for ${productTitles}. Total: ₦${orderTotal.toLocaleString()}`,
                order.id
              );
            } catch (notifErr) {
              console.warn("Seller notification error:", notifErr);
            }

            // Send email notification to seller
            try {
              await supabase.functions.invoke("send-email", {
                body: {
                  to: sellerProfile.email,
                  subject: "New Order Received - CampusConnect",
                  html: `
                    <h2>New Order Received!</h2>
                    <p>Hello ${sellerProfile.full_name},</p>
                    <p>You have received a new order:</p>
                    <ul>
                      <li><strong>Products:</strong> ${productTitles}</li>
                      <li><strong>Buyer:</strong> ${
                        buyerProfile?.full_name || "Unknown"
                      }</li>
                      <li><strong>Total Amount:</strong> ₦${orderTotal.toLocaleString()}</li>
                      <li><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</li>
                    </ul>
                    <p><strong>⚠️ Important:</strong> Payment will be automatically released in 2 days if the buyer doesn't confirm receipt.</p>
                    <p>Please log in to your dashboard to manage this order.</p>
                    <p>Best regards,<br>CampusConnect Team</p>
                  `,
                },
              });
            } catch (emailError) {
              // Error handled silently
            }
          }

          // Create in-app notification for buyer
          try {
            const { sendOrderNotification } = await import('@/utils/notificationService');
            await sendOrderNotification(
              user!.id,
              "Order Placed Successfully! ✅",
              `Your order for ${productTitles} has been placed. Total: ₦${orderTotal.toLocaleString()}`,
              order.id
            );
          } catch (notifErr) {
            console.warn("Buyer notification error:", notifErr);
          }

          // Send email confirmation to buyer
          if (buyerProfile) {
            try {
              await supabase.functions.invoke("send-email", {
                body: {
                  to: buyerProfile.email,
                  subject: "Order Confirmation - CampusConnect",
                  html: `
                    <h2>Order Confirmation</h2>
                    <p>Hello ${buyerProfile.full_name},</p>
                    <p>Your order has been successfully placed:</p>
                    <ul>
                      <li><strong>Products:</strong> ${productTitles}</li>
                      <li><strong>Seller:</strong> ${
                        sellerProfile?.full_name || "Unknown"
                      }</li>
                      <li><strong>Total Amount:</strong> ₦${orderTotal.toLocaleString()}</li>
                      <li><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</li>
                    </ul>
                    <p>You can track your order in your account dashboard.</p>
                    <p>Best regards,<br>CampusConnect Team</p>
                  `,
                },
              });
            } catch (emailError) {
              // Error handled silently
            }
          }

          return order;
        }
      );

      await Promise.all(orderPromises);

      // Clear cart
      await supabase.from("cart").delete().eq("user_id", user!.id);

      // Invalidate cart queries to refresh UI
      await queryClient.invalidateQueries({ queryKey: ["cart", user!.id] });

      // Trigger cart update event to refresh cart count and UI
      window.dispatchEvent(new CustomEvent("cartUpdated"));

      // Update analytics
      for (const item of cartItems.filter((item) => item.products?.id)) {
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
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
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
      <main className="container mx-auto px-4 py-6 sm:py-8 pb-24 md:pb-8">
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
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">
              Checkout
            </h1>
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
                        <Label
                          htmlFor="fullName"
                          className="text-sm sm:text-base"
                        >
                          Full Name *
                        </Label>
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
                        <Label htmlFor="email" className="text-sm sm:text-base">
                          Email *
                        </Label>
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
                      <Label htmlFor="phone" className="text-sm sm:text-base">
                        Phone Number *
                      </Label>
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
                      <Label
                        htmlFor="universityName"
                        className="text-sm sm:text-base"
                      >
                        University Name *
                      </Label>
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
                      <Label htmlFor="address">School/hostel Address *</Label>
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
                        <div className="relative">
                          <select
                            value={formData.state}
                            onChange={(e) =>
                              handleInputChange("state", e.target.value)
                            }
                            className="w-full h-10 px-3 text-sm border border-input bg-background rounded-md"
                            required
                          >
                            <option value="">Select or search state</option>
                            <option value="Abia">Abia</option>
                            <option value="Adamawa">Adamawa</option>
                            <option value="Akwa Ibom">Akwa Ibom</option>
                            <option value="Anambra">Anambra</option>
                            <option value="Bauchi">Bauchi</option>
                            <option value="Bayelsa">Bayelsa</option>
                            <option value="Benue">Benue</option>
                            <option value="Borno">Borno</option>
                            <option value="Cross River">Cross River</option>
                            <option value="Delta">Delta</option>
                            <option value="Ebonyi">Ebonyi</option>
                            <option value="Edo">Edo</option>
                            <option value="Ekiti">Ekiti</option>
                            <option value="Enugu">Enugu</option>
                            <option value="FCT">FCT (Abuja)</option>
                            <option value="Gombe">Gombe</option>
                            <option value="Imo">Imo</option>
                            <option value="Jigawa">Jigawa</option>
                            <option value="Kaduna">Kaduna</option>
                            <option value="Kano">Kano</option>
                            <option value="Katsina">Katsina</option>
                            <option value="Kebbi">Kebbi</option>
                            <option value="Kogi">Kogi</option>
                            <option value="Kwara">Kwara</option>
                            <option value="Lagos">Lagos</option>
                            <option value="Nasarawa">Nasarawa</option>
                            <option value="Niger">Niger</option>
                            <option value="Ogun">Ogun</option>
                            <option value="Ondo">Ondo</option>
                            <option value="Osun">Osun</option>
                            <option value="Oyo">Oyo</option>
                            <option value="Plateau">Plateau</option>
                            <option value="Rivers">Rivers</option>
                            <option value="Sokoto">Sokoto</option>
                            <option value="Taraba">Taraba</option>
                            <option value="Yobe">Yobe</option>
                            <option value="Zamfara">Zamfara</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Method Section */}
                <Card className="border-2 border-emerald-500/20 shadow-md overflow-hidden">
                  <CardHeader className="pb-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                        <Shield className="h-5 w-5 text-emerald-600" />
                        Choose Payment Channel
                      </div>
                      <Badge className="bg-emerald-600 text-white font-semibold">100% Escrow Protected</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {/* Channel Selector Tabs */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
                      <button
                        type="button"
                        onClick={() => setPayChannel("transfer")}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium text-sm transition-all ${
                          payChannel === "transfer"
                            ? "bg-background text-emerald-700 dark:text-emerald-400 shadow-sm font-bold border border-emerald-500/30"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Building2 className="h-4 w-4 text-emerald-600" />
                        Bank Transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayChannel("card")}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium text-sm transition-all ${
                          payChannel === "card"
                            ? "bg-background text-emerald-700 dark:text-emerald-400 shadow-sm font-bold border border-emerald-500/30"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <CreditCard className="h-4 w-4 text-emerald-600" />
                        ATM Debit Card
                      </button>
                    </div>

                    {payChannel === "transfer" ? (
                      <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                            Your Assigned Bank Account
                          </span>
                          <span className="text-xs text-emerald-600 font-medium">Instant Anchor BaaS Transfer</span>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900 space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Bank Name:</span>
                            <span className="font-bold text-foreground">CoreStep Microfinance (Anchor)</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Account Number:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-base font-bold text-emerald-600 tracking-wider">
                                {nubanAccount || "Fetching Anchor NUBAN..."}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={handleCopyNuban}
                              >
                                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Account Name:</span>
                            <span className="font-medium text-foreground">CampusConnect / {formData.fullName || "Buyer"}</span>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          💡 <strong>How to Pay:</strong> Open your GTBank, Zenith, Access, Kuda, or PalmPay app, transfer <strong>₦{getFinalTotal().toLocaleString()}</strong> to the account details above, then click submit below!
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 border rounded-xl space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="cardNumber" className="text-xs font-semibold">Card Number</Label>
                          <Input
                            id="cardNumber"
                            placeholder="5399 **** **** 1234 (Mastercard / Visa / Verve)"
                            value={cardDetails.cardNumber}
                            onChange={(e) => setCardDetails(prev => ({ ...prev, cardNumber: e.target.value }))}
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="cardExpiry" className="text-xs font-semibold">Expiry Date</Label>
                            <Input
                              id="cardExpiry"
                              placeholder="12/28"
                              value={cardDetails.expiry}
                              onChange={(e) => setCardDetails(prev => ({ ...prev, expiry: e.target.value }))}
                              className="text-sm font-mono"
                            />
                          </div>
                          <div>
                            <Label htmlFor="cardCvv" className="text-xs font-semibold">CVV Code</Label>
                            <Input
                              id="cardCvv"
                              type="password"
                              maxLength={3}
                              placeholder="123"
                              value={cardDetails.cvv}
                              onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e.target.value }))}
                              className="text-sm font-mono"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                          <Shield className="h-3.5 w-3.5" />
                          <span>Secured 256-bit encrypted card processing via Anchor BaaS</span>
                        </div>
                      </div>
                    )}
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
                      {cartItems
                        .filter((item) => item.products?.id)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3"
                          >
                            {item.products?.images?.[0] && (
                              <img
                                src={item.products.images[0]}
                                alt={item.products?.title || "Product image"}
                                className="w-12 h-12 object-cover rounded"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium text-sm line-clamp-1">
                                {item.products?.title || "Unknown Product"}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                by{" "}
                                {item.products?.profiles?.full_name ||
                                  "Unknown Seller"}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  Qty: {item.quantity}
                                </Badge>
                                {item.selected_size && (
                                  <Badge variant="outline" className="text-xs">
                                    Size: {item.selected_size}
                                  </Badge>
                                )}
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
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Info className="h-3 w-3" />
                        <span>No platform fees - Full amount goes to seller</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                        <Info className="h-3 w-3" />
                        <span>You will pay your delivery fee to the driver on delivery</span>
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
                      ) : payChannel === "transfer" ? (
                        <>
                          <Building2 className="h-4 w-4 mr-2" />
                          I Have Transferred ₦{getFinalTotal().toLocaleString()} — Complete Order ⚡
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay ₦{getFinalTotal().toLocaleString()} with ATM Debit Card 💳
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

          {/* Interactive Anchor Payment Selection Modal */}
          <AnchorPaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            totalAmount={getFinalTotal()}
            nubanAccount={nubanAccount}
            userName={formData.fullName}
            onConfirmPayment={handleConfirmModalPayment}
            processing={processing}
          />
        </div>
      </main>
    </div>
  );
};

export default Checkout;
