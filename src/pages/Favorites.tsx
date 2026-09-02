import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
  ShoppingCart,
  MessageCircle,
  Trash2,
  Package,
  ShieldCheck,
} from "lucide-react";
import { PullToRefresh } from "@/components/common/PullToRefresh";

interface FavoriteProduct {
  id: string;
  product_id: string;
  created_at: string;
  products: {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    campus: string;
    condition: string;
    images: string[];
    is_active: boolean;
    stock_quantity: number;
    seller_id: string;
    profiles: {
      user_id: string;
      full_name: string;
      rating: number;
      is_verified: boolean;
    };
  };
}

const conditionLabel = (condition: string) =>
  condition === "like_new"
    ? "Like New"
    : condition.charAt(0).toUpperCase() + condition.slice(1);

const Favorites = () => {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchFavorites();
  };

  const fetchFavorites = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("favorites")
        .select(
          `
          *,
          products!inner (
            *,
            profiles!products_seller_id_fkey (
              user_id,
              full_name,
              rating,
              is_verified,
              avatar_url
            )
          )
        `
        )
        .eq("user_id", user.id)
        .eq("products.is_active", true)
        .order("created_at", { ascending: false });

      // Sort to prioritize verified sellers
      if (data) {
        data.sort((a, b) => {
          const aVerified = a.products?.profiles?.is_verified;
          const bVerified = b.products?.profiles?.is_verified;
          if (aVerified && !bVerified) return -1;
          if (!aVerified && bVerified) return 1;
          return 0;
        });
      }

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load favorites",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (
    favoriteId: string,
    productTitle: string
  ) => {
    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId);

      if (error) throw error;

      setFavorites(favorites.filter((f) => f.id !== favoriteId));
      toast({
        title: "Removed from Favorites",
        description: `${productTitle} has been removed from your favorites`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive",
      });
    }
  };

  const handleAddToCart = async (productId: string, productTitle: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Check if already in cart
      const { data: existingCart } = await supabase
        .from("cart")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existingCart) {
        // Update quantity
        const { error } = await supabase
          .from("cart")
          .update({ quantity: existingCart.quantity + 1 })
          .eq("id", existingCart.id);

        if (error) throw error;
      } else {
        // Add new item
        const { error } = await supabase.from("cart").insert({
          user_id: user.id,
          product_id: productId,
          quantity: 1,
        });

        if (error) throw error;
      }

      toast({
        title: "Added to Cart",
        description: `${productTitle} has been added to your cart`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to cart",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8">
          <div className="animate-pulse space-y-6">
            <div className="space-y-2">
              <div className="h-8 w-1/3 rounded-full bg-flora-chip" />
              <div className="h-4 w-1/2 rounded-full bg-flora-chip" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-3xl bg-white shadow-card">
                  <div className="aspect-square bg-flora-chip" />
                  <div className="space-y-2 p-3">
                    <div className="h-4 rounded-full bg-flora-chip" />
                    <div className="h-4 w-2/3 rounded-full bg-flora-chip" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <PullToRefresh onRefresh={fetchFavorites} className="min-h-screen">
        <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold leading-tight text-flora-ink sm:text-4xl">
                My Favorites
              </h1>
              <p className="mt-1 text-flora-muted">
                {favorites.length > 0
                  ? `You have ${favorites.length} favorite item${
                      favorites.length === 1 ? "" : "s"
                    }`
                  : "You haven't added any favorites yet"}
              </p>
            </div>
            {favorites.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-flora-tagBg px-3 py-1.5 text-sm font-medium text-flora-tagText">
                <Heart className="h-4 w-4 fill-current" />
                {favorites.length} items
              </span>
            )}
          </div>

          {favorites.length > 0 && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-flora-chip px-3 py-1.5 text-xs text-flora-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-flora-leaf" />
              Verified sellers' products are prioritized in your favorites
            </p>
          )}

          {favorites.length === 0 ? (
            <div className="mt-8 rounded-4xl bg-white/70 py-12 text-center shadow-card sm:py-16">
              <div className="mx-auto max-w-md">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-flora-chip sm:h-20 sm:w-20">
                  <Heart className="h-8 w-8 text-flora-muted sm:h-10 sm:w-10" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-flora-ink sm:text-xl">
                  No favorites yet
                </h3>
                <p className="mb-6 text-sm text-flora-muted sm:text-base">
                  Start browsing and add products to your favorites to see them here
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/marketplace")}
                  className="rounded-full bg-flora-leaf px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-105"
                >
                  Browse Marketplace
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {favorites.map((favorite) => {
                const product = favorite.products;
                return (
                  <div
                    key={favorite.id}
                    className="flex cursor-pointer flex-col overflow-hidden rounded-3xl bg-white shadow-card transition hover:brightness-[0.98]"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    <div className="relative aspect-square overflow-hidden bg-flora-chip">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="h-8 w-8 text-flora-muted" />
                        </div>
                      )}

                      <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-flora-ink">
                        {conditionLabel(product.condition)}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFavorite(favorite.id, product.title);
                        }}
                        aria-label={`Remove ${product.title} from favorites`}
                        className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-card transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      {product.stock_quantity === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-flora-ink/60">
                          <span className="text-xs font-medium text-white">Out of Stock</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-3">
                      <div className="flex-1 space-y-1">
                        <h3 className="line-clamp-2 text-sm font-medium leading-tight text-flora-ink">
                          {product.title}
                        </h3>

                        <div className="flex items-center gap-1 text-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/seller/${product.profiles?.user_id || product.seller_id}`
                              );
                            }}
                            className="truncate font-medium text-flora-leaf underline underline-offset-2 hover:brightness-90"
                          >
                            {product.profiles?.full_name || "Unknown"}
                          </button>
                          {product.profiles?.is_verified && (
                            <ShieldCheck className="h-3 w-3 shrink-0 text-flora-leaf" />
                          )}
                        </div>

                        <div className="text-base font-bold text-flora-leaf">
                          ₦{product.price.toLocaleString()}
                        </div>

                        {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
                          <div className="flex items-center gap-1 text-xs text-amber-600">
                            <Package className="h-2.5 w-2.5" />
                            <span>{product.stock_quantity} left</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2 flex gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/messages");
                          }}
                          disabled={product.stock_quantity === 0}
                          aria-label="Message seller"
                          className="flex h-7 flex-1 items-center justify-center rounded-full border border-flora-ink/15 text-flora-ink transition hover:bg-flora-chip disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(product.id, product.title);
                          }}
                          disabled={product.stock_quantity === 0}
                          aria-label="Add to cart"
                          className="flex h-7 flex-1 items-center justify-center rounded-full bg-flora-leaf text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </PullToRefresh>
    </div>
  );
};

export default Favorites;
