import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealTimeCart } from "@/hooks/useRealTimeCart";
import { useCartCount } from "@/contexts/CartCountContext";
import { PullToRefresh } from "@/components/common/PullToRefresh";
import { useToast } from "@/hooks/use-toast";
import { Tag } from "@/components/ui/tag";
import { Stepper } from "@/components/ui/stepper";
import { IconButton } from "@/components/ui/icon-button";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/marketplace/ProductCard";
import { Trash2, ShoppingCart, Package, ChevronLeft, ArrowLeft, Truck } from "lucide-react";
import { BUSINESS_RULES, IGBINEDION_UNIVERSITY } from "@/lib/constants";
import { useProfile } from "@/contexts/ProfileContext";

interface CartItem {
  id: string;
  quantity: number;
  product_id: string;
  selected_size?: string;
  products: {
    id: string;
    title: string;
    price: number;
    stock_quantity: number;
    category: string;
    images: string[];
    seller_id: string;
    profiles: {
      full_name: string;
    };
  };
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(price);

const Cart = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const isIgbinedionStudent = profile?.university_name === IGBINEDION_UNIVERSITY;
  const [recommendedProducts, setRecommendedProducts] = useState<
    ProductCardProduct[]
  >([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateOptimistically: updateCartCountOptimistically } =
    useCartCount();
  // Owns the `cart` table subscription (unique per-instance channel name,
  // invalidates the ["cart", user.id] query on change) — the effect below
  // only needs its own channel for `orders`/`products`, which drive stock
  // and recommendation refreshes rather than the cart list itself.
  useRealTimeCart();
  const [offlineCartItems, setOfflineCartItems] = useOfflineStorage<CartItem[]>(
    {
      key: `cart_${user?.id}`,
      defaultValue: [],
      ttl: 10 * 60 * 1000, // 10 minutes
    }
  );

  const fetchCartItems = async (): Promise<CartItem[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from("cart")
      .select(
        `
        *,
        products (
          id,
          title,
          price,
          stock_quantity,
          category,
          images,
          seller_id,
          profiles!products_seller_id_fkey ( full_name )
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // The select above pulls every `cart` column (`*`) plus the joined
    // product — CartItem only declares the subset this page actually
    // renders, so this narrows rather than misrepresenting the row shape.
    const allItems = (data || []) as unknown as CartItem[];
    setOfflineCartItems(allItems);
    return allItems;
  };

  // Talks to react-query directly instead of through useOptimizedQuery —
  // that wrapper gates `enabled` behind its own isOnline detection and
  // defaults refetchOnMount based on whether anything's cached, and in
  // practice that combination meant a second visit to this page could
  // render straight from cache with no corresponding network fetch at all
  // (confirmed by logging: no fetchCartItems() call on remount). staleTime
  // 0 means this query is never considered fresh, and the explicit
  // refetch() in the effect below means showing the latest cart no longer
  // depends on any refetch-on-mount option resolving correctly in the
  // first place — it just always happens, every mount, guaranteed by
  // useEffect's own semantics rather than a query-observer heuristic.
  const {
    data: cartItems = offlineCartItems,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: fetchCartItems,
    enabled: !!user,
    placeholderData: offlineCartItems,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: true,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  useEffect(() => {
    if (user?.id) refetch();
  }, [user?.id, refetch]);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const fetchRecommendedProducts = useCallback(
    async (currentCartItems: CartItem[]) => {
      try {
        let query = supabase
          .from("products")
          .select(
            `
            id, title, price, stock_quantity, images,
            profiles!products_seller_id_fkey ( full_name )
          `
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(8);

        const categories = [
          ...new Set(
            currentCartItems
              .filter((item) => item.products?.category)
              .map((item) => item.products.category)
          ),
        ];
        const productIds = currentCartItems
          .filter((item) => item.products?.id)
          .map((item) => item.products.id);

        if (categories.length > 0 && productIds.length > 0) {
          query = query
            .in("category", categories)
            .not("id", "in", `(${productIds.join(",")})`);
        }

        const { data, error: queryError } = await query;
        if (queryError) throw queryError;

        const transformed: ProductCardProduct[] = (data || [])
          .filter((item) => item?.id && item.title && item.images?.length > 0)
          .map((item) => ({
            id: item.id,
            title: item.title,
            price: item.price || 0,
            stock_quantity: item.stock_quantity || 0,
            images: item.images || [],
            sellerName: item.profiles?.full_name || "Unknown seller",
          }));

        setRecommendedProducts(transformed);
      } catch {
        // Recommendations are a nice-to-have — a failed fetch just leaves
        // the section empty instead of blocking the rest of the page.
      }
    },
    []
  );

  useEffect(() => {
    if (cartItems.length > 0) {
      fetchRecommendedProducts(cartItems);
    }
  }, [cartItems, fetchRecommendedProducts]);

  // Orders and products (stock) are the two things outside the `cart`
  // table itself that should still refresh this page — useRealTimeCart
  // above already handles `cart` changes on its own channel.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`cart-page-related_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          const orderData = payload.new as { buyer_id?: string };
          if (orderData?.buyer_id === user.id) refetch();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          refetch();
          if (cartItems.length > 0) fetchRecommendedProducts(cartItems);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch, cartItems, fetchRecommendedProducts]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load cart items",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const updateQuantity = async (
    cartItemId: string,
    newQuantity: number,
    delta: number
  ) => {
    try {
      updateCartCountOptimistically(delta);
      const { error: updateError } = await supabase
        .from("cart")
        .update({ quantity: newQuantity })
        .eq("id", cartItemId);

      if (updateError) throw updateError;

      await queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
      window.dispatchEvent(new CustomEvent("cartUpdated"));
    } catch {
      updateCartCountOptimistically(-delta);
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    const item = cartItems.find((i) => i.id === cartItemId);
    try {
      if (item) updateCartCountOptimistically(-item.quantity);
      const { error: deleteError } = await supabase
        .from("cart")
        .delete()
        .eq("id", cartItemId);

      if (deleteError) throw deleteError;

      await queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });
      window.dispatchEvent(new CustomEvent("cartUpdated"));

      toast({
        title: "Item removed",
        description: "Item removed from your cart",
      });
    } catch {
      if (item) updateCartCountOptimistically(item.quantity);
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    }
  };

  const addToCart = async (productId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add items to cart",
        variant: "destructive",
      });
      return;
    }

    try {
      updateCartCountOptimistically(1);

      const { data: existingItem } = await supabase
        .from("cart")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existingItem) {
        const { error: updateError } = await supabase
          .from("cart")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("cart")
          .insert({ user_id: user.id, product_id: productId, quantity: 1 });
        if (insertError) throw insertError;
      }

      await queryClient.invalidateQueries({ queryKey: ["cart", user.id] });
      window.dispatchEvent(new CustomEvent("cartUpdated"));
      toast({
        title: "Added to cart",
        description: "Item added to your cart successfully",
      });
    } catch {
      updateCartCountOptimistically(-1);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  const cartProductIds = useMemo(
    () => new Set(cartItems.map((item) => item.product_id)),
    [cartItems]
  );

  const handleToggleRecommended = (productId: string) => {
    const existing = cartItems.find((item) => item.product_id === productId);
    if (existing) {
      removeFromCart(existing.id);
    } else {
      addToCart(productId);
    }
  };

  const subtotal = useMemo(
    () =>
      cartItems
        .filter((item) => item.products?.price)
        .reduce(
          (total, item) => total + (item.products?.price || 0) * item.quantity,
          0
        ),
    [cartItems]
  );

  const itemCount = useMemo(
    () =>
      cartItems
        .filter((item) => item.products?.id)
        .reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );

  // Delivery is paid in cash to the driver, not through checkout — it's
  // informational only and never added to what Paystack charges.
  const deliveryFee = BUSINESS_RULES.delivery.flatRate;

  const proceedToCheckout = () => {
    const validItems = cartItems.filter(
      (item) => item.products && item.products.id
    );
    if (validItems.length === 0) {
      toast({
        title: "Empty cart",
        description: "Add some items to your cart first",
        variant: "destructive",
      });
      return;
    }
    navigate("/checkout");
  };

  const handleViewProduct = (productId: string) => navigate(`/product/${productId}`);

  const recommendedHeading =
    cartItems.length === 0 ? "Recommended for You" : "You Might Also Like";

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <main className="mx-auto max-w-6xl px-3 pt-6 sm:px-6 sm:pt-8">
          <div className="rounded-4xl bg-white/70 py-12 text-center shadow-card sm:py-16">
            <div className="mx-auto max-w-md">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-flora-chip sm:h-20 sm:w-20">
                <ShoppingCart
                  className="h-8 w-8 text-flora-muted sm:h-10 sm:w-10"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-flora-ink sm:text-xl">
                Sign in to view your cart
              </h3>
              <p className="mb-6 text-sm text-flora-muted sm:text-base">
                Please sign in to access your shopping cart
              </p>
              <Link
                to="/auth?mode=signin"
                className="inline-block rounded-full bg-flora-leaf px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-105"
              >
                Sign In
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading && cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <main className="mx-auto max-w-6xl px-3 pt-6 sm:px-6 sm:pt-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/4 rounded bg-flora-chip" />
            <div className="h-64 rounded-3xl bg-white shadow-card" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <main className="mx-auto max-w-6xl px-3 pt-6 pb-10 sm:px-6 sm:pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <IconButton
                icon={ChevronLeft}
                label="Go back"
                tone="light"
                size="sm"
                onClick={() => navigate(-1)}
                className="sm:hidden"
              />
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-flora-ink sm:text-4xl lg:text-5xl">
                Cart{itemCount > 0 ? ` (${itemCount})` : ""}
              </h1>
            </div>
            <Link
              to="/marketplace"
              className="hidden items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-flora-ink shadow-card transition hover:brightness-105 sm:flex"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Continue shopping
            </Link>
          </div>

          {cartItems.length === 0 ? (
            <div className="mt-6 rounded-4xl bg-white/70 py-12 text-center shadow-card sm:py-16">
              <div className="mx-auto max-w-md">
                <img
                  src="/empty-cart.png"
                  alt=""
                  className="mx-auto mb-6 h-20 w-20 object-contain sm:h-24 sm:w-24"
                />
                <h3 className="mb-2 text-lg font-semibold text-flora-ink sm:text-xl">
                  Your cart is empty
                </h3>
                <p className="mb-6 text-sm text-flora-muted sm:text-base">
                  Browse our marketplace to find products you love
                </p>
                <Link
                  to="/marketplace"
                  className="inline-block rounded-full bg-flora-leaf px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-105"
                >
                  Browse Products
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              {/* Column header — desktop only. The row grid below repeats
                  this exact column template so labels line up with cells;
                  mobile has no equivalent since each row folds price/qty/
                  total into one compact line instead of separate columns. */}
              <div className="hidden border-b border-flora-ink/10 pb-3 text-xs font-semibold uppercase tracking-wide text-flora-muted lg:grid lg:grid-cols-[1fr_110px_150px_130px_40px] lg:gap-4">
                <span>Product</span>
                <span>Price</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Total</span>
                <span aria-hidden="true" />
              </div>

              <ul>
                {cartItems.map((item) =>
                  !item.products ? (
                    <li
                      key={item.id}
                      className="flex items-center gap-4 border-b border-flora-ink/8 py-5 last:border-0"
                    >
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-flora-chip">
                        <Package
                          className="h-6 w-6 text-flora-muted"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-flora-ink">
                          Product no longer available
                        </p>
                        <p className="text-xs text-flora-muted">
                          This item has been removed or is no longer available
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Remove item"
                        onClick={() => removeFromCart(item.id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-flora-muted transition hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  ) : (
                    <li
                      key={item.id}
                      className="flex items-center gap-4 border-b border-flora-ink/8 py-5 last:border-0 lg:grid lg:grid-cols-[1fr_110px_150px_130px_40px] lg:gap-4"
                    >
                      {/* Product cell */}
                      <div className="flex min-w-0 flex-1 items-center gap-4 lg:flex-initial">
                        <img
                          src={item.products.images?.[0] || "/placeholder.svg"}
                          alt={item.products.title}
                          onClick={() => handleViewProduct(item.products.id)}
                          className="h-16 w-16 shrink-0 cursor-pointer rounded-2xl bg-flora-chip object-cover lg:h-20 lg:w-20"
                        />

                        <div className="min-w-0">
                          <h3
                            onClick={() => handleViewProduct(item.products.id)}
                            className="cursor-pointer truncate text-base font-medium text-flora-ink"
                          >
                            {item.products.title}
                          </h3>
                          <p className="truncate text-xs text-flora-muted">
                            by {item.products.profiles?.full_name || "Unknown seller"}
                          </p>
                          {item.selected_size && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              <Tag variant="outline" className="px-3 py-1 text-xs">
                                Size: {item.selected_size}
                              </Tag>
                            </div>
                          )}
                          {/* Unit price folds in here on mobile only — desktop
                              shows it in its own Price column instead. */}
                          <p className="mt-1.5 text-sm font-semibold text-flora-ink lg:hidden">
                            {formatPrice(item.products.price)}
                          </p>
                        </div>
                      </div>

                      {/* Price cell — desktop only */}
                      <div className="hidden self-center text-sm font-medium text-flora-ink lg:block">
                        {formatPrice(item.products.price)}
                      </div>

                      {/* Qty cell */}
                      <div className="flex shrink-0 items-center lg:justify-center">
                        <Stepper
                          quantity={item.quantity}
                          itemLabel={item.products.title}
                          onIncrease={() =>
                            item.quantity < item.products.stock_quantity &&
                            updateQuantity(item.id, item.quantity + 1, 1)
                          }
                          onDecrease={() =>
                            item.quantity > 1 &&
                            updateQuantity(item.id, item.quantity - 1, -1)
                          }
                        />
                      </div>

                      {/* Total cell — desktop only */}
                      <div className="hidden self-center text-right text-base font-bold text-flora-ink lg:block">
                        {formatPrice(item.products.price * item.quantity)}
                      </div>

                      <button
                        type="button"
                        aria-label={`Remove ${item.products.title} from cart`}
                        onClick={() => removeFromCart(item.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full text-flora-muted transition hover:bg-destructive/10 hover:text-destructive lg:justify-self-end"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  )
                )}
              </ul>

              {/* Bottom summary bar — full width instead of a sidebar, so it
                  reads as one continuous surface beneath the item table
                  rather than a separate panel competing for attention next
                  to it. Delivery stays read-only here (Checkout.tsx is the
                  one place that choice is actually made and saved). */}
              <div className="mt-8 flex flex-col gap-6 rounded-4xl bg-flora-chip p-6 shadow-card sm:p-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="lg:max-w-sm">
                  <h3 className="text-base font-semibold text-flora-ink">Delivery</h3>
                  <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flora-tagBg text-flora-tagText">
                      <Truck className="h-5 w-5" aria-hidden="true" />
                    </span>
                    {isIgbinedionStudent ? (
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-flora-ink">
                          {formatPrice(deliveryFee)} delivery available
                        </p>
                        <p className="text-xs text-flora-muted">
                          Paid to the driver, around Igbinedion University
                        </p>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-flora-ink">
                          Pay on delivery
                        </p>
                        <p className="text-xs text-flora-muted">
                          You'll pay the delivery fee to the driver on delivery
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:w-[360px] lg:shrink-0">
                  <dl className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-flora-ink">
                      <dt>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</dt>
                      <dd className="font-medium">{formatPrice(subtotal)}</dd>
                    </div>
                    <div className="flex items-center justify-between border-t border-flora-ink/10 pt-2 text-base font-semibold text-flora-ink">
                      <dt>Total</dt>
                      <dd>{formatPrice(subtotal)}</dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    onClick={proceedToCheckout}
                    className="mt-4 flex w-full items-center justify-between rounded-full bg-flora-ink px-6 py-4 text-base font-medium text-white transition hover:brightness-110 active:scale-[0.99]"
                  >
                    <span>Checkout</span>
                    <span className="font-semibold">{formatPrice(subtotal)}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {recommendedProducts.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-flora-ink">
                {recommendedHeading}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
                {recommendedProducts.slice(0, 4).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isInCart={cartProductIds.has(product.id)}
                    onSelect={handleViewProduct}
                    onToggleCart={handleToggleRecommended}
                  />
                ))}
              </div>
            </section>
          )}
        </main>
      </PullToRefresh>
    </div>
  );
};

export default Cart;
