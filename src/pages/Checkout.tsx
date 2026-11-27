import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { BUSINESS_RULES, IGBINEDION_UNIVERSITY } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tag } from "@/components/ui/tag";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  MapPin,
  Lock,
  ChevronLeft,
  Shield,
  Info,
  User as UserIcon,
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import {
  clearPendingFlutterwaveCheckout,
  initiateFlutterwaveProductCheckout,
  readPendingFlutterwaveCheckout,
  savePendingFlutterwaveCheckout,
  type FlutterwaveCheckoutItem,
  type FlutterwaveCheckoutQueueItem,
  type PendingFlutterwaveCheckout,
} from "@/services/flutterwaveProductCheckoutService";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(price);

// Filled instead of outlined — a soft flora-chip fill at rest that lifts to
// white with a flora-leaf focus ring, rather than a bordered box. Same
// tokens as the rest of the app (flora-chip, flora-leaf), just a different
// resting/focus relationship: the field itself carries the surface instead
// of a border doing the work.
const fieldClass =
  "h-12 w-full rounded-2xl border border-transparent bg-flora-chip px-4 text-sm text-flora-ink placeholder:text-flora-muted transition focus:border-transparent focus:bg-white focus:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-flora-leaf/50";
const labelClass = "text-sm font-medium text-flora-ink";
// Circular icon badge anchoring each step of the timeline.
const stepIconClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flora-leaf text-white shadow-card";

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

interface SellerOrderSpec {
  sellerId: string;
  items: FlutterwaveCheckoutItem[];
}

const Checkout = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const resumedCheckoutRef = useRef(false);
  const [formData, setFormData] = useState<CheckoutForm>({
    fullName: "",
    email: "",
    phone: "",
    universityName: "",
    address: "",
    city: "",
    state: "",
    paymentMethod: "flutterwave_escrow",
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

      const pendingCheckout = readPendingFlutterwaveCheckout();
      if (pendingCheckout && pendingCheckout.buyerId !== user.id) {
        clearPendingFlutterwaveCheckout();
      }

      // The profile supplies contact details, while the address is deliberately
      // stored in a private owner-only table rather than public profiles.
      const [{ data: profile }, { data: savedAddress }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, email, phone_number, university_name, campus")
          .eq("user_id", user.id)
          .single(),
        (supabase as any)
          .from("user_delivery_addresses")
          .select("address, city, state")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (profile || savedAddress) {
        setFormData((prev) => ({
          ...prev,
          fullName: profile?.full_name || "",
          email: profile?.email || user.email || "",
          phone: profile?.phone_number || "",
          universityName: profile?.university_name || "",
          address: savedAddress?.address || "",
          city: savedAddress?.city || "",
          state: savedAddress?.state || "",
        }));
      }
      // Payment collection is started server-side and completed in Flutterwave.

      fetchCartItems(user.id, pendingCheckout?.buyerId === user.id && pendingCheckout.nextIndex < pendingCheckout.queue.length);
    } catch (error) {
      navigate("/auth");
    }
  };

  const fetchCartItems = async (userId: string, allowEmptyCart = false) => {
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

      if (validItems.length === 0 && !allowEmptyCart) {
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

  const getItemCount = () => {
    return cartItems
      .filter((item) => item.products?.id)
      .reduce((total, item) => total + item.quantity, 0);
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

  const buildOrderQueue = (): SellerOrderSpec[] => {
    const validCartItems = cartItems.filter((item) => item.products?.seller_id);
    const sellerGroups = validCartItems.reduce((groups, item) => {
      const sellerId = item.products.seller_id;
      if (!groups[sellerId]) groups[sellerId] = [];
      groups[sellerId].push(item);
      return groups;
    }, {} as Record<string, CartItem[]>);

    return Object.entries(sellerGroups).map(([sellerId, items]) => ({
      sellerId,
      items: items.map((item) => ({
        cartItemId: item.id,
        productId: item.products.id,
        quantity: item.quantity,
        selectedSize: item.selected_size || null,
      })),
    }));
  };

  const saveDeliveryAddress = async () => {
    if (!user) return false;
    const { error } = await (supabase as any)
      .from("user_delivery_addresses")
      .upsert(
        {
          user_id: user.id,
          address: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    if (!error) return true;

    toast({
      title: "Could not save delivery address",
      description: "Please try again before proceeding to payment.",
      variant: "destructive",
    });
    return false;
  };

  const handlePayment = async () => {
    if (!validateForm() || !user) {
      return;
    }
    if (!(await saveDeliveryAddress())) return;
    const queue = buildOrderQueue();
    if (queue.length === 0) return;
    startOrder(queue, 0);
  };

  // Every seller is checked out separately so the paid order maps to one seller's
  // escrow. Flutterwave receives an authoritative total calculated by the server.
  const startOrder = async (
    queue: SellerOrderSpec[] | FlutterwaveCheckoutQueueItem[],
    index: number,
    resumedCheckout?: PendingFlutterwaveCheckout
  ) => {
    if (index >= queue.length || !user) return;
    setProcessing(true);
    const items = queue[index].items;
    const shippingAddress = resumedCheckout?.shippingAddress || `${formData.address}, ${formData.city}, ${formData.state}`;
    const universityName = resumedCheckout?.universityName || formData.universityName;
    const res = await initiateFlutterwaveProductCheckout({ items, shippingAddress, universityName });

    if (!res.success || !res.orderId || !res.paymentReference || !res.paymentLink) {
      setProcessing(false);
      toast({
        title: index > 0 ? "Remaining order failed to start" : "Order failed",
        description:
          (res.message || "Could not start this order's payment.") +
          (index > 0 ? " Your earlier order(s) in this checkout were already placed." : ""),
        variant: "destructive",
      });
      return;
    }

    savePendingFlutterwaveCheckout({
      buyerId: user.id,
      queue: queue as FlutterwaveCheckoutQueueItem[],
      nextIndex: index,
      shippingAddress,
      universityName,
      orderId: res.orderId,
      paymentReference: res.paymentReference,
      cartItemIds: items.map((item) => item.cartItemId),
    });
    window.location.assign(res.paymentLink);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!processing) {
      void handlePayment();
    }
  };

  useEffect(() => {
    const pendingCheckout = readPendingFlutterwaveCheckout();
    if (
      loading || !user || resumedCheckoutRef.current || !pendingCheckout ||
      pendingCheckout.buyerId !== user.id || pendingCheckout.orderId ||
      pendingCheckout.nextIndex >= pendingCheckout.queue.length
    ) return;
    resumedCheckoutRef.current = true;
    startOrder(pendingCheckout.queue, pendingCheckout.nextIndex, pendingCheckout);
  }, [loading, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <main className="mx-auto max-w-6xl px-3 pt-6 pb-10 sm:px-6 sm:pt-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/4 rounded bg-flora-chip" />
            <div className="h-96 rounded-3xl bg-white shadow-card" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <main className="mx-auto max-w-6xl px-3 pt-6 pb-10 sm:px-6 sm:pt-8">
        <div className="flex items-center gap-3">
          <IconButton
            icon={ChevronLeft}
            label="Back to cart"
            tone="light"
            size="sm"
            onClick={() => navigate("/cart")}
          />
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-flora-ink sm:text-4xl">
            Checkout
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-8">
          {/* Checkout form — a numbered flow instead of a stacked form.
              Checkout genuinely is a sequence (contact, then delivery,
              then address, then payment), so a connected step timeline
              earns its place here rather than being decorative scaffolding.
              No card boundary at all: the icon badges and connecting line
              carry the structure, so the surface itself can stay quiet. */}
          <div>
            {/* Contact Information */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className={stepIconClass}>
                  <UserIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="mt-2 w-px flex-1 bg-flora-ink/15" aria-hidden="true" />
              </div>
              <div className="flex-1 pb-8">
              <h2 className="mb-4 text-lg font-semibold text-flora-ink">
                Contact Information
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className={labelClass}>
                      Full Name *
                    </Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                      required
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className={labelClass}>
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                      className={fieldClass}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className={labelClass}>
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+234 801 234 5678"
                    required
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="universityName" className={labelClass}>
                    University Name *
                  </Label>
                  <Input
                    id="universityName"
                    value={formData.universityName}
                    onChange={(e) => handleInputChange("universityName", e.target.value)}
                    placeholder="Enter your university name"
                    required
                    className={fieldClass}
                  />
                </div>
              </div>
              </div>
            </div>

            {/* Delivery Address — the only fulfillment method now, so this
                is unconditional instead of gated behind a pickup/delivery
                choice. The fee notice that used to live in its own step
                folds in here: the specific amount only for students at the
                one campus it's actually priced for, a generic line for
                everyone else. */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className={stepIconClass}>
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="mt-2 w-px flex-1 bg-flora-ink/15" aria-hidden="true" />
              </div>
              <div className="flex-1 pb-8">
                <h2 className="mb-4 text-lg font-semibold text-flora-ink">
                  Delivery Address
                </h2>
                <p className="mb-4 text-xs text-flora-muted">
                  Your latest delivery address is saved for next time. Edit the fields below whenever you want to use a different address.
                </p>
                {formData.universityName === IGBINEDION_UNIVERSITY ? (
                  <p className="mb-4 flex items-start gap-1.5 text-xs text-flora-muted">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {formatPrice(BUSINESS_RULES.delivery.flatRate)} delivery fee, paid
                    directly to the driver on delivery — not charged here.
                  </p>
                ) : (
                  <p className="mb-4 flex items-start gap-1.5 text-xs text-flora-muted">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    You'll pay the delivery fee to the driver on delivery.
                  </p>
                )}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="address" className={labelClass}>
                      School/hostel Address *
                    </Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder="Enter your full address"
                      rows={3}
                      required
                      className={cn(fieldClass, "h-auto py-3")}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="city" className={labelClass}>
                        City *
                      </Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange("city", e.target.value)}
                        required
                        className={fieldClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="state" className={labelClass}>
                        State *
                      </Label>
                      <select
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleInputChange("state", e.target.value)}
                        className={fieldClass}
                        required
                      >
                        <option value="">Select state</option>
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
                </div>
              </div>

            {/* Flutterwave presents the eligible payment channels after Pay is
                clicked. The server creates the order and escrow state first. */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className={stepIconClass}>
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <div className="flex-1">
              <h2 className="mb-4 text-lg font-semibold text-flora-ink">
                Payment Method
              </h2>
              <div className="flex items-center gap-3 rounded-2xl border border-flora-ink/10 bg-flora-chip p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-card">
                  <Building2 className="h-5 w-5 text-flora-leaf" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-flora-ink">
                    Flutterwave checkout (Escrow Locked)
                  </p>
                  <p className="text-xs text-flora-muted">
                    Pay by card, bank transfer, or any Flutterwave option available
                    to you. Funds remain in escrow until receipt is confirmed.
                  </p>
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Order Summary — the one panel that gets shadow-floating instead
              of shadow-card, the same elevation ProductDetails reserves for
              its primary action surface. Everything else on the page is
              flat by comparison, which is the point: this is the surface
              the eye should land on. */}
          <div className="mt-6 lg:sticky lg:top-24 lg:mt-0">
            <div className="rounded-3xl bg-flora-chip p-5 shadow-floating sm:p-6">
              <h2 className="text-base font-semibold text-flora-ink sm:text-lg">
                Order Summary
              </h2>

              <div className="mt-4 space-y-3">
                {cartItems
                  .filter((item) => item.products?.id)
                  .map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <img
                        src={item.products.images?.[0] || "/placeholder.svg"}
                        alt={item.products.title}
                        className="h-14 w-14 shrink-0 rounded-2xl bg-white object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium text-flora-ink">
                          {item.products.title}
                        </h3>
                        <p className="truncate text-xs text-flora-ink/70">
                          by {item.products.profiles?.full_name || "Unknown seller"}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Tag variant="outline" className="px-2.5 py-0.5 text-[11px]">
                            Qty: {item.quantity}
                          </Tag>
                          {item.selected_size && (
                            <Tag variant="outline" className="px-2.5 py-0.5 text-[11px]">
                              Size: {item.selected_size}
                            </Tag>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-semibold text-flora-ink">
                        {formatPrice((item.products.price || 0) * item.quantity)}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="mt-4 space-y-2 border-t border-flora-ink/10 pt-4 text-xs text-flora-ink/70">
                <p className="flex items-start gap-1.5">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  No platform fees — full amount goes to the seller
                </p>
                <p className="flex items-start gap-1.5 rounded-xl bg-flora-tagBg p-2.5 text-flora-tagText">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  You'll pay your delivery fee directly to the driver on delivery
                </p>
              </div>

              <div className="mt-4 space-y-2 border-t border-flora-ink/10 pt-4">
                <div className="flex items-center justify-between text-sm text-flora-ink">
                  <span>
                    Subtotal ({getItemCount()} {getItemCount() === 1 ? "item" : "items"})
                  </span>
                  <span className="font-medium">{formatPrice(getTotalPrice())}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-flora-ink">Total</span>
                  <span className="text-2xl font-bold tracking-tight text-flora-ink">
                    {formatPrice(getFinalTotal())}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-flora-ink py-4 text-base font-medium text-white shadow-floating transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processing ? (
                  "Processing..."
                ) : (
                  <>
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    Pay securely with Flutterwave
                  </>
                )}
              </button>

              <div className="mt-4 space-y-1.5 text-center">
                <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-flora-leaf">
                  <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                  Protected by Escrow System
                </p>
                <p className="text-xs text-flora-ink/70">Card, bank transfer, and other methods are completed on Flutterwave. Your payment is held until you confirm receipt.</p>
              </div>
            </div>
          </div>
        </form>

      </main>
    </div>
  );
};

export default Checkout;
