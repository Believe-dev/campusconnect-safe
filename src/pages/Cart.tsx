import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useRealTimeCart } from "@/hooks/useRealTimeCart";
import { Button } from "@/components/ui/enhanced-button";
import { SAFE_PROFILE_SELECT } from "@/lib/profileSecurity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PullToRefresh } from "@/components/common/PullToRefresh";
import { useToast } from "@/hooks/use-toast";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  ArrowRight,
  Package,
  Heart,
  MessageCircle,
} from "lucide-react";
import ProductCard from "@/components/marketplace/ProductCard";
import { User } from "@supabase/supabase-js";

interface CartItem {
  id: string;
  quantity: number;
  product_id: string;
  selected_size?: string;
  products: {
    id: string;
    title: string;
    description: string;
    price: number;
    stock_quantity: number;
    condition: string;
    category: string;
    campus: string;
    images: string[];
    seller_id: string;
    profiles: {
      full_name: string;
      rating: number;
      is_verified: boolean;
    };
  };
}

interface CartProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  campus: string;
  condition: string;
  images: string[];
  seller_id: string;
  stock_quantity: number;
  seller: {
    full_name: string;
    rating: number;
    is_verified: boolean;
  };
}

const Cart = () => {
  const { user } = useAuth();
  const [recommendedProducts, setRecommendedProducts] = useState<CartProduct[]>(
    []
  );
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useRealTimeCart();
  const [offlineCartItems, setOfflineCartItems] = useOfflineStorage<CartItem[]>(
    {
      key: `cart_${user?.id}`,
      defaultValue: [],
      ttl: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Remove automatic redirect - let user stay on page even if not authenticated

  const fetchCartItems = async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from("cart")
      .select(
        `
        *,
        products (
          *,
          profiles!products_seller_id_fkey (
            full_name,
            rating,
            is_verified
          )
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const allItems = data || [];
    setOfflineCartItems(allItems);
    return allItems;
  };

  const {
    data: cartItems = offlineCartItems,
    isLoading,
    error,
    refetch,
  } = useOptimizedQuery({
    queryKey: ["cart", user?.id],
    queryFn: fetchCartItems,
    enabled: !!user,
    placeholderData: offlineCartItems,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const handleRefresh = useCallback(async () => {
    await refetch();
    setLastUpdated(new Date());
  }, [refetch]);

  useEffect(() => {
    if (cartItems.length > 0) {
      fetchRecommendedProducts(cartItems);
    }
  }, [cartItems]);

  // Real-time updates for cart and orders
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`cart-realtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart",
        },
        (payload) => {
          const cartData = payload.new as any;
          if (cartData?.user_id === user.id) {
            refetch();
            setLastUpdated(new Date());
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const orderData = payload.new as any;
          if (orderData?.buyer_id === user.id) {
            // Order created, refresh cart to show updated stock
            refetch();
            setLastUpdated(new Date());
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          // Product updated, refresh cart and recommendations
          refetch();
          setLastUpdated(new Date());
          if (cartItems.length > 0) {
            fetchRecommendedProducts(cartItems);
          }
        }
      )
      .subscribe((status) => {
        setIsRealTimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch, cartItems]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load cart items",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const fetchRecommendedProducts = async (currentCartItems: CartItem[]) => {
    setLoadingRecommended(true);
    try {
      let query = supabase
        .from("products")
        .select(
          `
          *,
          profiles!products_seller_id_fkey (
            full_name,
            avatar_url,
            is_verified,
            rating
          )
        `
        )
        .eq("is_active", true)
        .limit(8);

      if (currentCartItems.length > 0) {
        // Get categories from cart items for "You might also like"
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
            .not("id", "in", `(${productIds.join(",")})`)
            .order("created_at", { ascending: false });
        } else {
          query = query.order("created_at", { ascending: false });
        }
      } else {
        // Get popular/recent products for empty cart
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform the data to match our Product interface
      const transformedData = (data || [])
        .filter(
          (item) =>
            item &&
            item.id &&
            item.title &&
            item.images &&
            item.images.length > 0
        )
        .map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description || "",
          price: item.price || 0,
          category: item.category || "Other",
          campus: item.campus || "Unknown Campus",
          condition: item.condition || "good",
          images: item.images || [],
          seller_id: item.seller_id,
          stock_quantity: item.stock_quantity || 0,
          seller: item.profiles
            ? {
                full_name: item.profiles.full_name || "Unknown Seller",
                rating: item.profiles.rating || 0,
                is_verified: item.profiles.is_verified || false,
              }
            : {
                full_name: "Unknown Seller",
                rating: 0,
                is_verified: false,
              },
        }));

      setRecommendedProducts(transformedData);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoadingRecommended(false);
    }
  };

  const updateQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      const { error } = await supabase
        .from("cart")
        .update({ quantity: newQuantity })
        .eq("id", cartItemId);

      if (error) throw error;

      // Invalidate and refetch cart data
      await queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });

      // Trigger cart count update
      window.dispatchEvent(new CustomEvent("cartUpdated"));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    try {
      const { error } = await supabase
        .from("cart")
        .delete()
        .eq("id", cartItemId);

      if (error) throw error;

      // Invalidate and refetch cart data
      await queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });

      // Trigger cart count update
      window.dispatchEvent(new CustomEvent("cartUpdated"));

      toast({
        title: "Item removed",
        description: "Item removed from your cart",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
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

  const getTotalItems = () => {
    return cartItems
      .filter((item) => item.products && item.products.id)
      .reduce((total, item) => total + item.quantity, 0);
  };

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

  const handleViewProduct = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  const handleMessageSeller = (sellerId: string) => {
    navigate(`/messages?seller=${sellerId}`);
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
      // Check if item already exists in cart
      const { data: existingItem } = await supabase
        .from("cart")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .single();

      if (existingItem) {
        // Update quantity if item exists
        const { error } = await supabase
          .from("cart")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);

        if (error) throw error;
      } else {
        // Add new item to cart
        const { error } = await supabase.from("cart").insert({
          user_id: user.id,
          product_id: productId,
          quantity: 1,
        });

        if (error) throw error;
      }

      toast({
        title: "Added to cart",
        description: "Item added to your cart successfully",
      });

      // Refresh cart items
      if (user) {
        queryClient.invalidateQueries({ queryKey: ["cart", user.id] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                Sign in to view your cart
              </h3>
              <p className="text-muted-foreground mb-6">
                Please sign in to access your shopping cart
              </p>
              <Button variant="brand" asChild>
                <a href="/auth">Sign In</a>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (isLoading && cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 flex-1">
              <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7 text-university-green" />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                Shopping Cart
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-university-green/10 text-university-green border-university-green/20">
                {getTotalItems()} {getTotalItems() === 1 ? "item" : "items"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetch();
                  setLastUpdated(new Date());
                  toast({
                    title: "Cart Refreshed",
                    description: "Your cart has been updated",
                  });
                }}
                className="h-9 px-4 text-sm border-2 border-gray-200 hover:border-university-green rounded-lg"
              >
                Reload Cart
              </Button>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isRealTimeConnected ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                <span className="hidden sm:inline">
                  {isRealTimeConnected ? "Live" : "Offline"}
                </span>
                <span className="text-xs">
                  {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {cartItems.length === 0 ? (
            <>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8 sm:p-12 text-center">
                  <Package className="h-16 w-16 sm:h-20 sm:w-20 text-gray-400 mx-auto mb-4 sm:mb-6" />
                  <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3">
                    Your cart is empty
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                    Browse our marketplace to find products you love
                  </p>
                  <Button
                    className="bg-university-green hover:bg-university-green/90 px-8 py-3"
                    asChild
                  >
                    <a href="/marketplace">Browse Products</a>
                  </Button>
                </CardContent>
              </Card>

              {/* Recommended Products for Empty Cart */}
              {recommendedProducts.length > 0 && (
                <div className="mt-8 sm:mt-12">
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-6">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
                        Recommended for You
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                        {recommendedProducts.slice(0, 4).map((product) => (
                          <Card
                            key={product.id}
                            className="group hover:shadow-lg transition-shadow duration-200 cursor-pointer overflow-hidden border-0 shadow-sm bg-white"
                            onClick={() => handleViewProduct(product.id)}
                          >
                            <div className="relative">
                              {product.images && product.images[0] ? (
                                <img
                                  src={product.images[0]}
                                  alt={product.title}
                                  className="w-full h-32 sm:h-36 lg:h-40 object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = "/placeholder.svg";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-32 sm:h-36 lg:h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                  <Package className="h-8 w-8 text-gray-400" />
                                </div>
                              )}

                              {/* Condition Badge */}
                              <div className="absolute top-2 left-2">
                                <Badge
                                  className={`text-xs px-1.5 py-0.5 font-medium ${
                                    product.condition === "new"
                                      ? "bg-green-500 text-white border-0"
                                      : "bg-blue-500 text-white border-0"
                                  }`}
                                >
                                  {product.condition.charAt(0).toUpperCase() +
                                    product.condition.slice(1)}
                                </Badge>
                              </div>

                              {/* Verified Seller Badge */}
                              {product.seller?.is_verified && (
                                <div className="absolute bottom-2 left-2">
                                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                                    <svg
                                      className="h-3 w-3 text-white"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>

                            <CardContent className="p-3">
                              <div className="space-y-2">
                                <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 leading-tight">
                                  {product.title}
                                </h3>

                                <Badge
                                  variant="outline"
                                  className="text-xs bg-gray-50 border-gray-200 w-fit"
                                >
                                  {product.category}
                                </Badge>

                                <div
                                  className="flex items-center gap-1.5 p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/seller/${product.seller_id}`);
                                  }}
                                >
                                  <div className="w-4 h-4 bg-university-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-medium text-university-green">
                                      {product.seller?.full_name?.charAt(0) ||
                                        "U"}
                                    </span>
                                  </div>
                                  <span className="text-xs font-medium text-university-green hover:underline truncate flex-1">
                                    {product.seller?.full_name || "Unknown"}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="text-base font-bold text-university-green">
                                    ₦{product.price.toLocaleString()}
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addToCart(product.id);
                                    }}
                                    className="text-xs px-2 py-1 bg-university-green hover:bg-university-green/90"
                                  >
                                    Add
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {cartItems.map((item) => (
                  <Card key={item.id} className="border-0 shadow-lg">
                    <CardContent className="p-4 sm:p-6">
                      {!item.products ? (
                        <div className="flex items-center gap-3 p-4 bg-muted rounded">
                          <Package className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-muted-foreground">
                              Product no longer available
                            </p>
                            <p className="text-xs text-muted-foreground">
                              This item has been removed or is no longer
                              available
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFromCart(item.id)}
                              className="mt-2"
                            >
                              Remove from cart
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3 sm:gap-4">
                          {item.products?.images?.[0] && (
                            <img
                              src={item.products.images[0]}
                              alt={item.products?.title || "Product image"}
                              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() =>
                                handleViewProduct(item.products.id)
                              }
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <div className="min-w-0 flex-1">
                                <h3
                                  className="font-semibold text-base sm:text-lg line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                                  onClick={() =>
                                    handleViewProduct(item.products.id)
                                  }
                                >
                                  {item.products?.title || "Unknown Product"}
                                </h3>
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                  by{" "}
                                  {item.products?.profiles?.full_name ||
                                    "Unknown Seller"}
                                </p>
                                <div className="flex gap-2 mt-1">
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {item.products?.condition?.replace(
                                      "_",
                                      " "
                                    ) || "Unknown"}
                                  </Badge>
                                  {item.selected_size && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Size: {item.selected_size}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFromCart(item.id)}
                                className="text-destructive hover:text-destructive h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity - 1)
                                  }
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 sm:w-8 text-center font-medium text-sm sm:text-base">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 sm:h-8 sm:w-8"
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity + 1)
                                  }
                                  disabled={
                                    item.quantity >=
                                    (item.products?.stock_quantity || 0)
                                  }
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <span className="text-xs text-muted-foreground ml-2">
                                  (
                                  {Math.max(
                                    0,
                                    item.products?.stock_quantity || 0
                                  )}{" "}
                                  available)
                                </span>
                              </div>

                              <div className="text-right">
                                <div className="text-base sm:text-lg font-bold">
                                  ₦
                                  {(
                                    (item.products?.price || 0) * item.quantity
                                  ).toLocaleString()}
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                  ₦
                                  {(item.products?.price || 0).toLocaleString()}{" "}
                                  each
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="lg:sticky lg:top-4 border-0 shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg sm:text-xl text-gray-900">
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Items ({getTotalItems()})</span>
                      <span>₦{getTotalPrice().toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span>Delivery</span>
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        Calculated at checkout
                      </span>
                    </div>

                    <div className="border-t pt-3 sm:pt-4">
                      <div className="flex justify-between text-base sm:text-lg font-bold">
                        <span>Total</span>
                        <span>₦{getTotalPrice().toLocaleString()}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-university-green hover:bg-university-green/90 py-3"
                      onClick={proceedToCheckout}
                    >
                      Proceed to Checkout
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full border-2 border-gray-200 hover:border-university-green"
                      asChild
                    >
                      <a href="/marketplace">Continue Shopping</a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* You Might Also Like - Only show when cart has items */}
          {cartItems.length > 0 && recommendedProducts.length > 0 && (
            <div className="mt-8 sm:mt-12">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
                    You Might Also Like
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {recommendedProducts.slice(0, 4).map((product) => (
                      <Card
                        key={product.id}
                        className="group hover:shadow-lg transition-shadow duration-200 cursor-pointer overflow-hidden border-0 shadow-sm bg-white"
                        onClick={() => handleViewProduct(product.id)}
                      >
                        <div className="relative">
                          {product.images && product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="w-full h-32 sm:h-36 lg:h-40 object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg";
                              }}
                            />
                          ) : (
                            <div className="w-full h-32 sm:h-36 lg:h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                          )}

                          {/* Condition Badge */}
                          <div className="absolute top-2 left-2">
                            <Badge
                              className={`text-xs px-1.5 py-0.5 font-medium ${
                                product.condition === "new"
                                  ? "bg-green-500 text-white border-0"
                                  : "bg-blue-500 text-white border-0"
                              }`}
                            >
                              {product.condition.charAt(0).toUpperCase() +
                                product.condition.slice(1)}
                            </Badge>
                          </div>

                          {/* Verified Seller Badge */}
                          {product.seller?.is_verified && (
                            <div className="absolute bottom-2 left-2">
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                                <svg
                                  className="h-3 w-3 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>

                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 leading-tight">
                              {product.title}
                            </h3>

                            <Badge
                              variant="outline"
                              className="text-xs bg-gray-50 border-gray-200 w-fit"
                            >
                              {product.category}
                            </Badge>

                            <div
                              className="flex items-center gap-1.5 p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/seller/${product.seller_id}`);
                              }}
                            >
                              <div className="w-4 h-4 bg-university-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium text-university-green">
                                  {product.seller?.full_name?.charAt(0) || "U"}
                                </span>
                              </div>
                              <span className="text-xs font-medium text-university-green hover:underline truncate flex-1">
                                {product.seller?.full_name || "Unknown"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="text-base font-bold text-university-green">
                                ₦{product.price.toLocaleString()}
                              </div>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product.id);
                                }}
                                className="text-xs px-2 py-1 bg-university-green hover:bg-university-green/90"
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        </main>
      </PullToRefresh>
    </div>
  );
};

export default Cart;
