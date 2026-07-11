import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PullToRefresh } from "@/components/common/PullToRefresh";
import { OfflineNotice } from "@/components/ui/offline-notice";
import { FilterChip } from "@/components/ui/filter-chip";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/marketplace/ProductCard";
import { DealOfTheDay } from "@/components/marketplace/DealOfTheDay";
import { pickDealsOfTheDay } from "@/lib/dealsOfTheDay";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/contexts/ProfileContext";
import { useCartCount } from "@/contexts/CartCountContext";
import { Package, RotateCcw, AlertCircle } from "lucide-react";
import "@/styles/animations.css";

interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  stock_quantity: number;
  condition: string;
  campus: string;
  images: string[];
  seller_id: string;
  created_at: string;
  profiles: {
    full_name: string;
    business_name?: string;
    rating: number;
    is_verified: boolean;
    campus?: string;
  };
}

const sellerName = (product: Product) =>
  product.profiles?.business_name || product.profiles?.full_name || "Unknown seller";

const toCardProduct = (product: Product): ProductCardProduct => ({
  id: product.id,
  title: product.title,
  price: product.price,
  stock_quantity: product.stock_quantity,
  images: product.images,
  sellerName: sellerName(product),
});

const CATEGORIES = [
  "Books & Textbooks",
  "Electronics",
  "Fashion & Accessories",
  "Food & Beverages",
  "Services",
  "Sports & Recreation",
  "Home & Living",
  "Other",
];

const CONDITIONS = ["All Conditions", "new", "excellent", "good", "fair"];

interface ProductGridProps {
  products: Product[];
  cart: Set<string>;
  onSelect: (productId: string) => void;
  onToggleCart: (productId: string) => void;
}

const ProductGrid = ({ products, cart, onSelect, onToggleCart }: ProductGridProps) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
    {products.map((product) => (
      <ProductCard
        key={product.id}
        product={toCardProduct(product)}
        isInCart={cart.has(product.id)}
        onSelect={onSelect}
        onToggleCart={onToggleCart}
      />
    ))}
  </div>
);

const Marketplace = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const { user } = useAuth();
  const { profile } = useProfile();
  const { updateOptimistically: updateCartCountOptimistically } = useCartCount();
  const userUniversity = profile?.university_name || null;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // All categories are active (shown, removable) by default. Removing one
  // hides that category's products; it moves into the "Filters" panel where
  // it can be added back.
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set());
  const [selectedCondition, setSelectedCondition] = useState("All Conditions");
  const [sortBy, setSortBy] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await fetchProducts();
    if (user) {
      await fetchUserData(user.id);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Re-fetch favorites/cart whenever the signed-in user changes, so switching
  // accounts in the same session doesn't leave a previous user's state behind.
  useEffect(() => {
    if (user) {
      fetchUserData(user.id);
    } else {
      setFavorites(new Set());
      setCart(new Set());
    }
  }, [user]);

  useEffect(() => {
    filterProducts();
  }, [products, excludedCategories, selectedCondition, sortBy, userUniversity]);

  const fetchProducts = async () => {
    setLoadError(false);
    try {
      // Optimize for slow connections - fetch only essential fields
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          id,
          title,
          description,
          category,
          price,
          stock_quantity,
          condition,
          campus,
          images,
          seller_id,
          created_at,
          profiles!products_seller_id_fkey (
            full_name,
            business_name,
            rating,
            is_verified,
            campus
          )
        `
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      setLoadError(true);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch favorites
      const { data: favoritesData } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", userId);

      if (favoritesData) {
        setFavorites(new Set(favoritesData.map((f) => f.product_id)));
      }

      // Fetch cart
      const { data: cartData } = await supabase
        .from("cart")
        .select("product_id")
        .eq("user_id", userId);

      if (cartData) {
        setCart(new Set(cartData.map((c) => c.product_id)));
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Products only ever come from the signed-in user's own university —
    // there is no toggle to opt into seeing other campuses.
    if (userUniversity) {
      filtered = filtered.filter((product) => product.campus === userUniversity);
    }

    // Category filter — exclude products whose category the user removed
    if (excludedCategories.size > 0) {
      filtered = filtered.filter(
        (product) => !excludedCategories.has(product.category)
      );
    }

    // Condition filter
    if (selectedCondition !== "All Conditions") {
      filtered = filtered.filter(
        (product) => product.condition === selectedCondition
      );
    }

    // Separate verified and non-verified products
    const verified = filtered.filter((p) => p.profiles?.is_verified);
    const nonVerified = filtered.filter((p) => !p.profiles?.is_verified);

    // Sort function for products
    const sortFunction = (a: Product, b: Product) => {
      switch (sortBy) {
        case "price_low":
          return a.price - b.price;
        case "price_high":
          return b.price - a.price;
        case "newest":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        default:
          return 0;
      }
    };

    // Function to shuffle products ensuring no same seller products are adjacent
    const shuffleSellers = (products: Product[]) => {
      if (products.length <= 1) return products;

      // Group by seller
      const sellerGroups = products.reduce((acc, product) => {
        if (!acc[product.seller_id]) acc[product.seller_id] = [];
        acc[product.seller_id].push(product);
        return acc;
      }, {} as Record<string, Product[]>);

      // Sort each seller's products by criteria
      Object.values(sellerGroups).forEach((group) => group.sort(sortFunction));

      // Distribute products evenly
      const result: Product[] = [];
      const sellerQueues = Object.values(sellerGroups);

      while (sellerQueues.some((queue) => queue.length > 0)) {
        // Shuffle seller order each round
        const availableSellers = sellerQueues.filter(
          (queue) => queue.length > 0
        );
        for (let i = availableSellers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [availableSellers[i], availableSellers[j]] = [
            availableSellers[j],
            availableSellers[i],
          ];
        }

        // Take one product from each available seller
        availableSellers.forEach((queue) => {
          if (queue.length > 0) {
            result.push(queue.shift()!);
          }
        });
      }

      return result;
    };

    // Shuffle each group, verified first
    const shuffledVerified = shuffleSellers(verified);
    const shuffledNonVerified = shuffleSellers(nonVerified);

    setFilteredProducts([...shuffledVerified, ...shuffledNonVerified]);
  };

  const toggleFavorite = async (productId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add favorites",
        variant: "destructive",
      });
      return;
    }

    try {
      const isFavorited = favorites.has(productId);

      if (isFavorited) {
        await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);

        setFavorites((prev) => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });

        toast({
          title: "Removed from favorites",
          description: "Product removed from your favorites",
        });
      } else {
        await supabase
          .from("favorites")
          .insert({ user_id: user.id, product_id: productId });

        setFavorites((prev) => new Set([...prev, productId]));

        toast({
          title: "Added to favorites",
          description: "Product added to your favorites",
        });
      }

      // Update analytics
      await updateAnalytics(productId, "favorites_count", isFavorited ? -1 : 1);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    }
  };

  const addToCart = async (productId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add items to cart",
        variant: "destructive",
      });
      return;
    }

    try {
      // Optimistic update - update UI immediately
      setCart((prev) => new Set([...prev, productId]));
      updateCartCountOptimistically(1);

      toast({
        title: "Added to cart",
        description: "Product added to your cart",
      });

      // Then update database
      const { error } = await supabase
        .from("cart")
        .insert({ user_id: user.id, product_id: productId, quantity: 1 });

      if (error) {
        // Revert optimistic update on error
        setCart((prev) => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        updateCartCountOptimistically(-1);
        throw error;
      }

      // Update analytics
      await updateAnalytics(productId, "cart_additions", 1);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to cart",
        variant: "destructive",
      });
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!user) return;

    try {
      // Optimistic update - update UI immediately
      setCart((prev) => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
      updateCartCountOptimistically(-1);

      toast({
        title: "Removed from cart",
        description: "Product removed from your cart",
      });

      const { error } = await supabase
        .from("cart")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (error) {
        // Revert optimistic update on error
        setCart((prev) => new Set([...prev, productId]));
        updateCartCountOptimistically(1);
        throw error;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove from cart",
        variant: "destructive",
      });
    }
  };

  const toggleCart = (productId: string) => {
    if (cart.has(productId)) {
      removeFromCart(productId);
    } else {
      addToCart(productId);
    }
  };

  const updateAnalytics = async (
    productId: string,
    field: string,
    increment: number
  ) => {
    try {
      // First try to get existing analytics
      const { data: existing } = await supabase
        .from("product_analytics")
        .select(field)
        .eq("product_id", productId)
        .single();

      if (existing) {
        // Update existing
        await supabase
          .from("product_analytics")
          .update({
            [field]: Math.max(0, existing[field] + increment),
            last_updated: new Date().toISOString(),
          })
          .eq("product_id", productId);
      } else {
        // Create new analytics entry
        await supabase.from("product_analytics").insert({
          product_id: productId,
          [field]: Math.max(0, increment),
        });
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const clearFilters = () => {
    setExcludedCategories(new Set());
    setSelectedCondition("All Conditions");
    setSortBy("newest");
  };

  const removeCategory = (category: string) => {
    setExcludedCategories((prev) => new Set(prev).add(category));
  };

  const restoreCategory = (category: string) => {
    setExcludedCategories((prev) => {
      const next = new Set(prev);
      next.delete(category);
      return next;
    });
  };

  const hasActiveFilters =
    excludedCategories.size > 0 ||
    selectedCondition !== "All Conditions" ||
    sortBy !== "newest";

  // Deal of the day lineup is drawn from the university's full catalog,
  // independent of the current search/category/condition filters, so it
  // stays put as a stable daily pick rather than disappearing whenever
  // someone searches.
  const dealProducts = useMemo(() => {
    const pool = userUniversity
      ? products.filter((p) => p.campus === userUniversity)
      : products;
    return pickDealsOfTheDay(pool, 5);
  }, [products, userUniversity]);

  const dealProductIds = useMemo(
    () => new Set(dealProducts.map((p) => p.id)),
    [dealProducts]
  );

  const gridProducts = filteredProducts.filter((p) => !dealProductIds.has(p.id));

  const handleSelect = (productId: string) => navigate(`/product/${productId}`);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-3xl bg-white shadow-card">
                <div className="h-32 bg-flora-chip sm:h-40" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 rounded bg-flora-chip" />
                  <div className="h-4 w-1/2 rounded bg-flora-chip" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <main className="mx-auto max-w-6xl px-3 pt-6 sm:px-6 sm:pt-8">
          <OfflineNotice />

          <h1 className="text-3xl font-semibold leading-tight text-flora-ink sm:text-4xl">
            Buy &amp; Sell
            <br className="sm:hidden" /> Around Campus
          </h1>

          {/* Filters — chip row matching the reference exactly: a "Filters"
              toggle plus removable chips. Every category is active (and
              removable) by default; removing one hides its products and
              parks it in the "Filters" panel to be added back. */}
          <div className="mt-5 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterChip
              label="Filters"
              active
              onClick={() => setFiltersOpen((open) => !open)}
            />
            {CATEGORIES.filter((category) => !excludedCategories.has(category)).map(
              (category) => (
                <FilterChip
                  key={category}
                  label={category}
                  removable
                  onRemove={() => removeCategory(category)}
                />
              )
            )}
          </div>

          {filtersOpen && (
            <div className="mt-3 rounded-3xl border border-flora-ink/10 bg-white/70 p-4">
              {excludedCategories.size > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium text-flora-muted">
                    Removed categories — tap to add back
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.filter((category) => excludedCategories.has(category)).map(
                      (category) => (
                        <FilterChip
                          key={category}
                          label={category}
                          onClick={() => restoreCategory(category)}
                        />
                      )
                    )}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <select
                aria-label="Filter by condition"
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="h-11 rounded-2xl border border-flora-ink/10 bg-white px-3 text-sm text-flora-ink focus:border-flora-leaf focus:outline-none"
              >
                {CONDITIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {condition === "All Conditions"
                      ? condition
                      : condition.charAt(0).toUpperCase() + condition.slice(1)}
                  </option>
                ))}
              </select>

              <select
                aria-label="Sort products"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-11 rounded-2xl border border-flora-ink/10 bg-white px-3 text-sm text-flora-ink focus:border-flora-leaf focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>

              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-flora-ink/10 bg-white text-sm font-medium text-flora-ink transition hover:bg-flora-chip disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Clear filters
              </button>
              </div>
            </div>
          )}

          {loadError ? (
            <div className="mt-8 rounded-4xl bg-white/70 py-12 text-center shadow-card sm:py-16">
              <div className="mx-auto max-w-md">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-flora-chip sm:h-20 sm:w-20">
                  <AlertCircle className="h-8 w-8 text-flora-muted sm:h-10 sm:w-10" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-flora-ink sm:text-xl">
                  Couldn't load products
                </h3>
                <p className="mb-6 text-sm text-flora-muted sm:text-base">
                  Something went wrong fetching the marketplace. Check your connection and try again.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    fetchProducts();
                  }}
                  className="rounded-full bg-flora-leaf px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-105"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="mt-8 rounded-4xl bg-white/70 py-12 text-center shadow-card sm:py-16">
              <div className="mx-auto max-w-md">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-flora-chip sm:h-20 sm:w-20">
                  <Package className="h-8 w-8 text-flora-muted sm:h-10 sm:w-10" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-flora-ink sm:text-xl">
                  No products found
                </h3>
                <p className="mb-6 text-sm text-flora-muted sm:text-base">
                  {userUniversity
                    ? `We couldn't find anything at ${userUniversity} matching your criteria.`
                    : "We couldn't find any products matching your criteria."}
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full bg-flora-leaf px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-105"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          ) : (
            <>
              {dealProducts.length > 0 && (
                <DealOfTheDay
                  products={dealProducts.map((p) => ({
                    id: p.id,
                    title: p.title,
                    price: p.price,
                    images: p.images,
                    sellerName: sellerName(p),
                  }))}
                  isFavorited={(id) => favorites.has(id)}
                  onSelect={handleSelect}
                  onToggleFavorite={toggleFavorite}
                />
              )}

              <section className="mt-10 pb-10">
                <h2 className="text-xl font-semibold text-flora-ink">
                  {userUniversity ? `Trending at ${userUniversity}` : "Trending on Campus"}
                </h2>
                <div className="mt-4">
                  <ProductGrid
                    products={gridProducts}
                    cart={cart}
                    onSelect={handleSelect}
                    onToggleCart={toggleCart}
                  />
                </div>
              </section>
            </>
          )}
        </main>
      </PullToRefresh>
    </div>
  );
};

export default Marketplace;
