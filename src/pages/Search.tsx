import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PullToRefresh } from "@/components/common/PullToRefresh";
import { OfflineNotice } from "@/components/ui/offline-notice";
import { FilterChip } from "@/components/ui/filter-chip";
import SmartSearchInput from "@/components/search/SmartSearchInput";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/marketplace/ProductCard";
import { Package, RotateCcw, AlertCircle, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { expandSearchTerms } from "@/utils/searchUtils";
import { performAISearch, expandAISearchTerms } from "@/utils/aiSearch";
import { useProfile } from "@/contexts/ProfileContext";
import { useCartCount } from "@/contexts/CartCountContext";

interface SearchProduct {
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
  created_at: string;
  seller: {
    full_name: string;
    rating: number;
    is_verified: boolean;
  };
}

interface SearchSeller {
  user_id: string;
  full_name: string;
  business_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  rating: number;
}

// Same sets Marketplace.tsx filters on — kept identical so the two browse
// experiences offer literally the same options, not two parallel
// implementations that happen to look similar.
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

const sellerName = (item: SearchProduct) =>
  item.seller?.full_name || "Unknown seller";

const toCardProduct = (item: SearchProduct): ProductCardProduct => ({
  id: item.id,
  title: item.title,
  price: item.price,
  stock_quantity: item.stock_quantity,
  images: item.images,
  sellerName: sellerName(item),
});

const Search = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refetch: refetchCartCount } = useCartCount();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useProfile();
  const userUniversity = profile?.university_name || null;

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [sellerResults, setSellerResults] = useState<SearchSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState<Set<string>>(new Set());

  // Removable-chip model, identical to Marketplace: every category active
  // by default, removing one hides its products and parks it in the
  // "Filters" panel to be added back.
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set());
  const [selectedCondition, setSelectedCondition] = useState("All Conditions");
  const [sortBy, setSortBy] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) loadCartItems(user.id);
    } catch (error) {
      // Error handled silently
    }
  };

  const loadCartItems = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("cart")
        .select("product_id")
        .eq("user_id", userId);
      if (data) setCart(new Set(data.map((c) => c.product_id)));
    } catch (error) {
      // Error handled silently
    }
  };

  useEffect(() => {
    const query = searchParams.get("q");
    if (query !== null) setSearchQuery(query);
    searchProducts();
    searchSellers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, excludedCategories, selectedCondition, sortBy, userUniversity]);

  // Independent of searchProducts — a seller name match is a different
  // result kind (a person, not a listing), so it runs as its own query
  // against `profiles` rather than threading into the search function below.
  const searchSellers = async () => {
    const searchTerm = (searchParams.get("q") || "").trim();
    if (!searchTerm) {
      setSellerResults([]);
      return;
    }
    try {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, business_name, avatar_url, is_verified, rating")
        .in("account_type", ["seller", "both"])
        .eq("seller_status", "approved")
        .or(`full_name.ilike.%${searchTerm}%,business_name.ilike.%${searchTerm}%`)
        .limit(6)
        .returns<SearchSeller[]>();
      setSellerResults(data || []);
    } catch (error) {
      // Sellers are a supplementary section — a failure here shouldn't
      // block the product results below.
      setSellerResults([]);
    }
  };

  const handleRefresh = useCallback(async () => {
    await Promise.all([searchProducts(), searchSellers()]);
  }, []);

  // UniMarket is deliberately scoped to one university per user (the same
  // rule Marketplace.tsx enforces) — there is no "search all schools"
  // escape hatch here, on purpose.
  const searchProducts = async () => {
    setLoading(true);
    try {
      const searchTerm = (searchParams.get("q") || "").trim();

      let productQuery = supabase
        .from("products")
        .select(`*, profiles!products_seller_id_fkey (full_name, avatar_url, is_verified, rating)`)
        .eq("is_active", true);

      if (userUniversity) {
        productQuery = productQuery.eq("campus", userUniversity);
      }

      if (searchTerm) {
        const aiExpandedTerms = expandAISearchTerms(searchTerm);
        const fallbackTerms = expandSearchTerms(searchTerm);
        const allTerms = [...new Set([...aiExpandedTerms, ...fallbackTerms])];

        const conditions: string[] = [];
        allTerms.forEach((term) => {
          const escapedTerm = term.replace(/[%_]/g, "\\$&");
          conditions.push(`title.ilike.%${escapedTerm}%`);
          conditions.push(`description.ilike.%${escapedTerm}%`);
          conditions.push(`category.ilike.%${escapedTerm}%`);
        });
        if (conditions.length > 0) {
          productQuery = productQuery.or(conditions.join(","));
        }
      }

      const { data: productData } = await productQuery;

      let products: SearchProduct[] = (productData || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description || "",
        price: item.price,
        category: item.category,
        campus: item.campus || "Unknown Campus",
        condition: item.condition,
        images: item.images || [],
        seller_id: item.seller_id,
        stock_quantity: item.stock_quantity,
        created_at: item.created_at,
        seller: item.profiles
          ? {
              full_name: item.profiles.full_name,
              rating: item.profiles.rating,
              is_verified: item.profiles.is_verified,
            }
          : { full_name: "Unknown Seller", rating: 0, is_verified: false },
      }));

      // Category filter
      if (excludedCategories.size > 0) {
        products = products.filter((p) => !excludedCategories.has(p.category));
      }

      // Condition filter
      if (selectedCondition !== "All Conditions") {
        products = products.filter((p) => p.condition === selectedCondition);
      }

      // aiSearch.ts declares its own structurally-looser `SearchProduct`
      // (same name, different module) — this page's products satisfy it at
      // runtime (id/title/description/category/condition/images all
      // present), so the cast just bridges the two same-named interfaces
      // rather than indicating an actual shape mismatch.
      let combined = performAISearch(products, searchTerm) as SearchProduct[];

      combined = combined.sort((a, b) => {
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const score = (item: SearchProduct) => {
            const t = item.title.toLowerCase();
            const exact = t === searchLower ? 1000 : 0;
            const starts = t.startsWith(searchLower) ? 500 : 0;
            const includes = t.includes(searchLower) ? 100 : 0;
            return exact + starts + includes;
          };
          const diff = score(b) - score(a);
          if (diff !== 0) return diff;
        }
        switch (sortBy) {
          case "price_low":
            return a.price - b.price;
          case "price_high":
            return b.price - a.price;
          case "oldest":
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });

      setResults(combined);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load search results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (q: string) => {
    const trimmed = q.trim();
    const params = new URLSearchParams(searchParams);
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    setSearchParams(params);
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
    excludedCategories.size > 0 || selectedCondition !== "All Conditions" || sortBy !== "newest";

  const handleSelect = (productId: string) => navigate(`/product/${productId}`);

  const addToCart = async (productId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      setCart((prev) => new Set([...prev, productId]));
      refetchCartCount();

      const { data: existingItem } = await supabase
        .from("cart")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existingItem) {
        await supabase
          .from("cart")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);
      } else {
        await supabase.from("cart").insert({ user_id: user.id, product_id: productId, quantity: 1 });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to cart",
        variant: "destructive",
      });
    }
  };

  const query = searchParams.get("q") || "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <main className="mx-auto max-w-6xl px-3 pt-6 sm:px-6 sm:pt-8">
          <OfflineNotice />

          <h1 className="text-3xl font-semibold leading-tight text-flora-ink sm:text-4xl">
            Search
          </h1>

          <div className="mt-5">
            <SmartSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSearchSubmit}
              placeholder="Search products, sellers..."
            />
          </div>

          {query && (
            <p className="mt-3 text-sm text-flora-muted">
              Results for &ldquo;<span className="font-medium text-flora-ink">{query}</span>&rdquo;
              {!loading && (
                <>
                  {" "}
                  • {results.length} found{userUniversity ? ` at ${userUniversity}` : ""}
                </>
              )}
            </p>
          )}

          {/* Filters — same chip row + collapsible panel pattern as
              Marketplace, same option sets (category, condition, sort). No
              university filter: scoping is automatic, not user-selectable. */}
          <div className="mt-5 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterChip label="Filters" active onClick={() => setFiltersOpen((open) => !open)} />
            {CATEGORIES.filter((category) => !excludedCategories.has(category)).map((category) => (
              <FilterChip
                key={category}
                label={category}
                removable
                onRemove={() => removeCategory(category)}
              />
            ))}
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
                  aria-label="Sort results"
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

          {/* Sellers — a name/business-name match is a person, not a
              listing, so it gets its own section above the product grid.
              A horizontal-scroll row of boxes doesn't read well on a narrow
              screen (easy to miss, awkward tap targets), so mobile gets a
              proper stacked list instead; sm+ switches to a grid of cards
              once there's room for them to read as tiles rather than rows. */}
          {sellerResults.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-xl font-semibold text-flora-ink">Sellers</h2>
              <div className="divide-y divide-flora-ink/8 overflow-hidden rounded-3xl bg-white shadow-card sm:divide-y-0 sm:overflow-visible sm:rounded-none sm:bg-transparent sm:shadow-none sm:grid sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                {sellerResults.map((seller) => (
                  <button
                    key={seller.user_id}
                    type="button"
                    onClick={() => navigate(`/seller/${seller.user_id}`)}
                    className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-flora-chip/40 sm:flex-col sm:gap-2 sm:rounded-3xl sm:bg-white sm:p-4 sm:text-center sm:shadow-card sm:hover:bg-white sm:hover:brightness-[0.98]"
                  >
                    {seller.avatar_url ? (
                      <img
                        src={seller.avatar_url}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-flora-chip"
                      />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-flora-chip text-lg font-semibold text-flora-ink ring-2 ring-flora-chip">
                        {(seller.business_name || seller.full_name).charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-1 sm:w-full sm:flex-none sm:items-center">
                      <span className="w-full truncate text-sm font-medium text-flora-ink sm:text-center">
                        {seller.business_name || seller.full_name}
                      </span>
                      {seller.is_verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-flora-tagBg px-2 py-0.5 text-[10px] font-medium text-flora-tagText">
                          Verified
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <section className="mt-8 pb-10">
            {loading ? (
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
            ) : results.length === 0 ? (
              <div className="rounded-4xl bg-white/70 py-12 text-center shadow-card sm:py-16">
                <div className="mx-auto max-w-md">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-flora-chip sm:h-20 sm:w-20">
                    <AlertCircle className="h-8 w-8 text-flora-muted sm:h-10 sm:w-10" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-flora-ink sm:text-xl">
                    {query
                      ? `No results at ${userUniversity || "your university"} — try a different search term`
                      : "No products found"}
                  </h3>
                  <p className="mb-6 text-sm text-flora-muted sm:text-base">
                    Try adjusting your search terms or filters.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-full bg-flora-leaf px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-105"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
                {results.map((item) => (
                  <ProductCard
                    key={item.id}
                    product={toCardProduct(item)}
                    isInCart={cart.has(item.id)}
                    onSelect={handleSelect}
                    onToggleCart={addToCart}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      </PullToRefresh>
    </div>
  );
};

export default Search;
